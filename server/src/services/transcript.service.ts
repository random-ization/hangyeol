import { uploadCachedJson } from '../lib/storage';
import { checkFileExists, downloadJSON } from './storage.service';
import OpenAI from "openai";
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

// Set ffmpeg path
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

// ============================================
// 1. Initialization (Hybrid Strategy)
// ============================================

// Client 1: SiliconFlow for SenseVoice (Fast ASR)
const getAsrClient = () => {
    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) throw new Error('SILICONFLOW_API_KEY is not set');

    return new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.siliconflow.cn/v1"
    });
};

// Client 2: OpenAI Official for GPT-4o-mini (Smart Analysis)
const getLlmClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

    return new OpenAI({
        apiKey: apiKey
    });
};

// Types
export interface TranscriptSegment {
    start: number;
    end: number;
    text: string;
    translation?: string;
}

export interface TranscriptResult {
    segments: TranscriptSegment[];
    language: string;
    duration?: number;
    cached?: boolean;
}

const TRANSCRIPT_CACHE_PREFIX = 'transcripts/';
const TRANSCRIPT_CACHE_TTL = 86400; // 24 hours
const MAX_SIZE_FOR_COMPRESSION = 20 * 1024 * 1024; // 20MB

// ============================================
// 2. Helpers
// ============================================

const downloadAudioToFile = async (url: string): Promise<string> => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `podcast_${Date.now()}.mp3`);

    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const handleResponse = (res: any) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                if (res.headers.location) {
                    client.get(res.headers.location, handleResponse).on('error', reject);
                    return;
                }
            }
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download audio: ${res.statusCode}`));
                return;
            }
            const fileStream = fs.createWriteStream(tempFile);
            res.pipe(fileStream);
            fileStream.on('finish', () => { fileStream.close(); resolve(tempFile); });
            fileStream.on('error', (err) => { fs.unlink(tempFile, () => { }); reject(err); });
        };
        client.get(url, handleResponse).on('error', reject);
    });
};

/**
 * Compress audio to speed up upload.
 * Target: 16k sample rate, 64k bitrate, Mono.
 */
const compressAudio = async (inputPath: string): Promise<string> => {
    const outputPath = inputPath.replace('.mp3', '_opt.mp3');

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioChannels(1)
            .audioFrequency(16000)
            .audioBitrate('64k') // Updated to 64k as requested
            .output(outputPath)
            .on('end', () => {
                console.log('[Transcript] Compression complete');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('[Transcript] Compression failed:', err.message);
                reject(err);
            })
            .run();
    });
};
/**
 * Get audio duration using ffprobe
 */
const getAudioDuration = (filePath: string): Promise<number> => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration || 0);
        });
    });
};

const cleanupFiles = (...files: string[]) => {
    files.forEach(file => {
        if (file && fs.existsSync(file)) fs.unlinkSync(file);
    });
};

// ============================================
// 3. Core Logic (Hybrid IO)
// ============================================

/**
 * Step 1: Transcribe Audio (Returns Segments with Timestamps)
 * Provider: SiliconFlow (SenseVoiceSmall)
 */
const performStrictASR = async (filePath: string, maxDuration?: number): Promise<TranscriptSegment[]> => {
    const client = getAsrClient();
    console.log(`[ASR] Transcribing with SiliconFlow...`);

    try {
        const response: any = await client.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "FunAudioLLM/SenseVoiceSmall",

            // 🔥 CRITICAL SETTINGS 🔥
            response_format: "verbose_json",
            timestamp_granularities: ["segment"],
            language: "ko" // Force Korean to prevent hallucinations
        });

        // Debug logging
        // console.log(`[ASR Debug] Raw Keys:`, Object.keys(response));

        if (!response.segments) {
            console.warn(`[ASR] No segments returned. Checking fallback...`);

            // Fallback: If text exists, split it
            if (response.text) {
                console.warn("[ASR] Fallback: Using text-based splitting.");
                const text = response.text;
                // Simple split by . ? ! \n
                const sentences = text.match(/[^.!?\n]+[.!?\n]*(\s|$)/g) || [text];
                const totalDuration = response.duration || (text.length * 0.2);

                let currentTime = 0;
                const totalLength = text.length;

                return sentences.map((s: string) => {
                    const trimmed = s.trim();
                    const duration = totalLength > 0 ? (trimmed.length / totalLength) * totalDuration : 2;
                    const seg = {
                        start: currentTime,
                        end: currentTime + duration,
                        text: trimmed,
                        translation: ""
                    };
                    currentTime += duration;
                    return seg;
                }).filter((s: any) => s.text.length > 0);
            }
            throw new Error("ASR output missing segments");
        }

        let segments: TranscriptSegment[] = response.segments.map((seg: any) => ({
            start: seg.start,
            end: seg.end,
            text: seg.text.trim(),
            translation: ""
        }));

        // 🔥 FILTER: Remove segments beyond actual duration (Hallucination Fix)
        if (maxDuration) {
            const originalCount = segments.length;
            segments = segments.filter(req => req.start < maxDuration);

            // Clamp the last segment
            if (segments.length > 0) {
                const last = segments[segments.length - 1];
                if (last.end > maxDuration) last.end = maxDuration;
            }
            console.log(`[ASR] Duration Clamp: ${originalCount} -> ${segments.length} segments (Max: ${maxDuration}s)`);
        }

        return segments;

    } catch (error: any) {
        console.error("[ASR Failed]", error);
        throw new Error(`ASR_FAILED: ${error.message}`);
    }
}

/**
 * Step 2: On-Demand Analysis (Called when user clicks "Analyze" button)
 * Provider: OpenAI (GPT-4o-mini)
 */
export const analyzeSentence = async (sentence: string, context: string = "", targetLanguage: string = "zh"): Promise<any> => {
    const client = getLlmClient();
    console.log(`[LLM] Analyzing sentence with OpenAI (GPT-4o-mini)...`);

    const languageNames: Record<string, string> = {
        'zh': 'Chinese (Simplified)',
        'en': 'English',
        'ko': 'Korean',
        'vi': 'Vietnamese'
    };
    const outputLanguage = languageNames[targetLanguage] || 'Chinese (Simplified)';

    // Robust Prompt with Schema
    const prompt = `You are a professional Korean language tutor. Analyze the provided Korean sentence.
    
    Sentence: "${sentence}"
    ${context ? `Context: ${context}` : ''}
    
    Return a STRICT JSON object with the following structure. All explanations must be in ${outputLanguage}.
    
    {
      "vocabulary": [
        {
          "word": "The word as it appears",
          "root": "Dictionary/Root form",
          "meaning": "Definition in ${outputLanguage}",
          "type": "Noun"
        }
      ],
      "grammar": [
        {
          "structure": "Grammar pattern (e.g., -기가)",
          "explanation": "Explanation in ${outputLanguage}"
        }
      ],
      "nuance": "Formality, tone, and context in ${outputLanguage}"
    }
    
    Return ONLY valid JSON.`;

    try {
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful Korean tutor. Output strict JSON."
                },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2
        });

        const content = completion.choices[0].message.content;
        return content ? JSON.parse(content) : {};
    } catch (e) {
        console.error(`[Analysis Failed]`, e);
        throw e;
    }
};

/**
 * Orchestrator: Generate transcript for podcast
 */
export const generateTranscript = async (
    audioUrl: string,
    episodeId: string,
    targetLanguage: string = 'zh'
): Promise<TranscriptResult> => {
    console.log(`[Transcript] Generating transcript for episode: ${episodeId}`);

    // 1. Check Use Cache
    const cacheKey = `${TRANSCRIPT_CACHE_PREFIX}${episodeId}.json`;
    try {
        if (await checkFileExists(cacheKey)) {
            console.log(`[Transcript] Cache hit: ${cacheKey}`);
            const cached = await downloadJSON(cacheKey);
            return { ...cached, cached: true };
        }
    } catch (e) { /* ignore */ }

    let originalFile: string = '';
    let compressedFile: string = '';
    let uploadFile: string = '';

    try {
        // 2. Download audio
        console.log(`[Transcript] Downloading audio from: ${audioUrl}`);
        originalFile = await downloadAudioToFile(audioUrl);

        // 🔍 PROBE DURATION 🔍
        const originalDuration = await getAudioDuration(originalFile);
        console.log(`[Transcript] Audio Duration: ${originalDuration}s`);

        // 3. Compress if size > 20MB
        const stats = fs.statSync(originalFile);
        const sizeMB = stats.size / (1024 * 1024);

        if (stats.size > MAX_SIZE_FOR_COMPRESSION) {
            console.log(`[Transcript] File large (${sizeMB.toFixed(2)}MB), compressing...`);
            compressedFile = await compressAudio(originalFile);
            uploadFile = compressedFile;
        } else {
            uploadFile = originalFile;
        }

        // 4. Perform ASR (SiliconFlow) - Pass Duration for clamping
        const segments = await performStrictASR(uploadFile, originalDuration);

        const transcriptData: TranscriptResult = {
            segments: segments,
            language: 'ko',
            duration: originalDuration, // Use authoritative duration
            cached: false
        };

        // 5. Save to S3
        uploadCachedJson(cacheKey, transcriptData, TRANSCRIPT_CACHE_TTL).catch(console.warn);

        return transcriptData;

    } catch (e: any) {
        console.error(`[Transcript] Failed:`, e.message);
        throw e;
    } finally {
        cleanupFiles(originalFile, compressedFile);
    }
};

// Legacy support if needed
export const getTranscriptFromCache = async (episodeId: string): Promise<TranscriptResult | null> => {
    const cacheKey = `${TRANSCRIPT_CACHE_PREFIX}${episodeId}.json`;
    try {
        if (await checkFileExists(cacheKey)) {
            const cached = await downloadJSON(cacheKey);
            return { ...cached, cached: true };
        }
    } catch (e) { /* ignore */ }
    return null;
};
