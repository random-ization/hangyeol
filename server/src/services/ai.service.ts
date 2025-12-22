import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LRUCache } from 'lru-cache';
import { checkFileExists, uploadJSON, downloadJSON } from './storage.service';

// L1 内存缓存：最大 100 条，1 小时 TTL
const cache = new LRUCache<string, any>({
    max: 100,
    ttl: 1000 * 60 * 60, // 1 hour
});

// Gemini 客户端
let genAI: GoogleGenerativeAI | null = null;

const getGenAI = () => {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not configured');
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
};

// 生成题目唯一 hash（包含语言以区分不同语言的缓存）
const generateHash = (question: string, options: string[], language: string, imageUrl?: string): string => {
    const content = `${question}|${options.join('|')}|${language}|${imageUrl || ''}`;
    return crypto.createHash('md5').update(content).digest('hex');
};

// S3 缓存路径
const getCacheKey = (hash: string): string => {
    return `ai-cache/topik/${hash}.json`;
};

export interface TopikQuestionInput {
    question: string;
    options: string[];
    correctAnswer: number;
    type?: string;
    language?: string; // 'zh' | 'ko' | 'en'
    imageUrl?: string; // New: Image URL for image-based questions
}

export interface TopikAnalysisResult {
    translation: string;
    keyPoint: string;
    analysis: string;
    wrongOptions: Record<string, string>;
    cached?: boolean;
}

/**
 * 分析 TOPIK 题目 (支持图片+文本多模态)
 */
export const analyzeTopikQuestion = async (
    input: TopikQuestionInput
): Promise<TopikAnalysisResult> => {
    const { question, options, correctAnswer, type, language = 'zh', imageUrl } = input;

    // Language mapping for prompt
    const languageNames: Record<string, string> = {
        'zh': 'Chinese (Simplified)',
        'ko': 'Korean',
        'en': 'English',
        'vi': 'Vietnamese',
        'mn': 'Mongolian'
    };

    // Step 1: 生成 hash（包含语言和图片URL）
    const hash = generateHash(question, options, language, imageUrl);

    // Step 2: 检查 L1 内存缓存
    const cachedResult = cache.get(hash);
    if (cachedResult) {
        console.log(`[AI] L1 cache hit: ${hash}`);
        return { ...cachedResult, cached: true };
    }

    // Step 3: 检查 L2 S3 缓存
    const s3Key = getCacheKey(hash);
    try {
        const exists = await checkFileExists(s3Key);
        if (exists) {
            console.log(`[AI] L2 (S3) cache hit: ${hash}`);
            const s3Result = await downloadJSON(s3Key);
            cache.set(hash, s3Result); // 更新 L1
            return { ...s3Result, cached: true };
        }
    } catch (e) {
        console.warn(`[AI] S3 cache check failed:`, e);
    }

    // Step 4: 调用 Gemini API
    console.log(`[AI] Cache miss, calling Gemini API for: ${hash}`);
    console.log(`[AI] Has image: ${!!imageUrl}`);

    const ai = getGenAI();
    // Use gemini-2.5-flash-lite for multimodal support
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const optionsStr = options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
    const correctAnswerText = options[correctAnswer] || options[0];

    // Build prompt (different for image vs text questions)
    const basePrompt = `You are a strict Korean language exam proctor.
Analyze the following TOPIK question.

${imageUrl ? 'The question content is shown in the attached image.' : `Question: ${question}`}
Options:
${optionsStr}
Correct Answer: ${correctAnswer + 1}. ${correctAnswerText} (Explain why this is correct)
Question Type: ${type || 'general'}

${imageUrl ? 'First, carefully read and transcribe any Korean text visible in the image. Then analyze the question.' : ''}

IMPORTANT: All your output MUST be in ${languageNames[language] || 'Chinese (Simplified)'}.

Output pure JSON with these keys:
- translation: ${imageUrl ? 'Transcription and translation of the text in the image' : 'Translation of the question'} into ${languageNames[language] || 'Chinese'}
- keyPoint: Key grammar or vocabulary point being tested
- analysis: Detailed explanation of why the correct answer is right
- wrongOptions: Object with keys "1", "2", "3", "4" explaining why each wrong option is incorrect (skip the correct answer)

IMPORTANT: Return ONLY valid JSON, no markdown formatting. All text values must be in ${languageNames[language] || 'Chinese'}.`;

    let result;

    if (imageUrl) {
        // Multimodal: Image + Text
        try {
            // Check if imageUrl is relative
            let targetUrl = imageUrl;
            if (imageUrl.startsWith('/')) {
                // Warning: relative URL requires domain, but we might not know it easily server-side
                console.warn(`[AI] Received relative image URL: ${imageUrl}. This might fail.`);
                // If you have a known domain env var, verify it here.
                // Assuming absolute URLs for S3 uploads usually.
            }

            // Fetch image and convert to base64
            console.log(`[AI] Fetching image from: ${targetUrl}`);
            const imageResponse = await fetch(targetUrl);

            if (!imageResponse.ok) {
                console.error(`[AI] Failed to fetch image. Status: ${imageResponse.status}, URL: ${targetUrl}`);
                throw new Error(`Failed to fetch image: ${imageResponse.status}`);
            }

            const imageBuffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(imageBuffer).toString('base64');

            // Detect mime type from URL or default to png
            let mimeType = 'image/png';
            if (imageUrl.toLowerCase().includes('.jpg') || imageUrl.toLowerCase().includes('.jpeg')) {
                mimeType = 'image/jpeg';
            } else if (imageUrl.toLowerCase().includes('.webp')) {
                mimeType = 'image/webp';
            }

            console.log(`[AI] Image size: ${imageBuffer.byteLength} bytes, type: ${mimeType}`);

            // Call Gemini with image
            result = await model.generateContent([
                {
                    inlineData: {
                        mimeType,
                        data: base64Image
                    }
                },
                basePrompt
            ]);
        } catch (imgError) {
            console.error('[AI] Image processing failed:', imgError);
            // Fallback to text-only if image fails
            console.log('[AI] Falling back to text-only analysis');
            result = await model.generateContent(basePrompt);
        }
    } else {
        // Text-only
        result = await model.generateContent(basePrompt);
    }

    const responseText = result.response.text();

    // 解析 JSON 响应
    let analysisResult: TopikAnalysisResult;
    try {
        // 移除可能的 markdown 代码块标记
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
        analysisResult = JSON.parse(cleanJson);
    } catch (e) {
        console.error('[AI] Failed to parse Gemini response:', responseText);
        console.error('[AI] Parse error:', e);
        throw new Error('Failed to parse AI response as JSON');
    }

    // Step 5: 保存到 S3 和 L1 缓存
    try {
        await uploadJSON(s3Key, analysisResult);
        console.log(`[AI] Saved to S3: ${s3Key}`);
    } catch (e) {
        console.warn(`[AI] Failed to save to S3:`, e);
    }

    cache.set(hash, analysisResult);

    // Step 6: 返回结果
    return { ...analysisResult, cached: false };
};

/**
 * 处理视频字幕：恢复标点符号并翻译
 */
export const processTranscript = async (
    transcriptText: string,
    targetLanguage: string = 'zh'
): Promise<any> => {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `
    You are a professional subtitle editor.
    I will provide a raw transcript from a YouTube video. It lacks punctuation and may have minor speech recognition errors.
    
    Your task:
    1. Restore proper punctuation and casing.
    2. Divide the text into logical sentences/segments.
    3. Translate each segment into ${targetLanguage === 'zh' ? 'Simplified Chinese' : targetLanguage}.
    4. Extract key vocabulary words from the text (approx 5-10 words).

    Input Transcript:
    ${transcriptText.slice(0, 15000)} ... (truncated if too long)

    Output JSON format:
    {
      "segments": [
        { "original": "Original sentence 1...", "translated": "Translated sentence 1..." },
        { "original": "Original sentence 2...", "translated": "Translated sentence 2..." }
      ],
      "vocabulary": [
        { "word": "word1", "meaning": "meaning1" }
      ],
      "summary": "Brief summary of the content"
    }

    Return ONLY valid JSON.
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error('[AI] Transcript processing failed:', e);
        throw new Error('Failed to process transcript');
    }
};

// ============================================
// Sentence Analysis Types
// ============================================

export interface SentenceAnalysisInput {
    sentence: string;
    context?: string; // Optional surrounding context for better analysis
    language?: string; // Output language: 'zh' | 'en' | 'ko'
}

export interface VocabularyItem {
    word: string;
    root: string;
    meaning: string;
    type: string;
}

export interface GrammarItem {
    structure: string;
    explanation: string;
}

export interface SentenceAnalysisResult {
    vocabulary: VocabularyItem[];
    grammar: GrammarItem[];
    nuance: string;
    cached?: boolean;
}

/**
 * Analyze a Korean sentence for vocabulary, grammar, and nuance
 */
export const analyzeSentence = async (
    input: SentenceAnalysisInput
): Promise<SentenceAnalysisResult> => {
    const { sentence, context, language = 'zh' } = input;

    // Language mapping
    const languageNames: Record<string, string> = {
        'zh': 'Chinese (Simplified)',
        'en': 'English',
        'ko': 'Korean',
        'vi': 'Vietnamese'
    };

    const outputLanguage = languageNames[language] || 'Chinese (Simplified)';

    // Generate hash for caching
    const hash = crypto.createHash('md5').update(`sentence:${sentence}:${language}`).digest('hex');

    // Check L1 cache
    const cachedResult = cache.get(hash);
    if (cachedResult) {
        console.log(`[AI] L1 cache hit for sentence: ${hash}`);
        return { ...cachedResult, cached: true };
    }

    // Check L2 S3 cache
    const s3Key = `ai-cache/sentence/${hash}.json`;
    try {
        const exists = await checkFileExists(s3Key);
        if (exists) {
            console.log(`[AI] L2 (S3) cache hit for sentence: ${hash}`);
            const s3Result = await downloadJSON(s3Key);
            cache.set(hash, s3Result);
            return { ...s3Result, cached: true };
        }
    } catch (e) {
        console.warn(`[AI] S3 cache check failed:`, e);
    }

    // Call Gemini API
    console.log(`[AI] Cache miss for sentence analysis, calling Gemini`);

    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `You are a professional Korean language tutor. Analyze the provided Korean sentence.

Sentence: "${sentence}"
${context ? `\nContext: ${context}` : ''}

Return a STRICT JSON object with the following structure. All explanations must be in ${outputLanguage}.

{
  "vocabulary": [
    {
      "word": "The word as it appears in the sentence",
      "root": "Dictionary form / Root form",
      "meaning": "Definition in ${outputLanguage}",
      "type": "Noun/Verb/Adjective/Adverb/etc."
    }
  ],
  "grammar": [
    {
      "structure": "Grammar pattern (e.g., -기가, -네요)",
      "explanation": "Detailed explanation of this grammar in ${outputLanguage}"
    }
  ],
  "nuance": "Overall tone, formality level, and cultural context of this sentence in ${outputLanguage}"
}

Important rules:
1. Extract ALL vocabulary words from the sentence (minimum 3-5 words)
2. Identify ALL grammar patterns used (minimum 1-3 patterns)
3. The nuance should explain formality (존댓말/반말), emotional tone, and any cultural context
4. Return ONLY valid JSON, no markdown formatting`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse JSON response
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const analysisResult: SentenceAnalysisResult = JSON.parse(cleanJson);

        // Save to S3 and L1 cache
        try {
            await uploadJSON(s3Key, analysisResult);
            console.log(`[AI] Saved sentence analysis to S3: ${s3Key}`);
        } catch (e) {
            console.warn(`[AI] Failed to save to S3:`, e);
        }

        cache.set(hash, analysisResult);

        return { ...analysisResult, cached: false };
    } catch (e) {
        console.error('[AI] Sentence analysis failed:', e);
        throw new Error('Failed to analyze sentence');
    }
};
