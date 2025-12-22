import { Request, Response } from 'express';
import { analyzeTopikQuestion, TopikQuestionInput, analyzeSentence, SentenceAnalysisInput } from '../services/ai.service';

/**
 * POST /api/ai/analyze-question
 * 分析 TOPIK 题目
 */
export const analyzeQuestion = async (req: Request, res: Response) => {
    try {
        const { question, options, correctAnswer, type, imageUrl } = req.body;

        // 验证必填字段
        // 如果有图片，question 可以为空
        if (!imageUrl && (!question || typeof question !== 'string')) {
            return res.status(400).json({ error: 'question is required (unless imageUrl is provided) and must be a string' });
        }

        if (!Array.isArray(options) || options.length < 2) {
            return res.status(400).json({ error: 'options must be an array with at least 2 items' });
        }

        if (typeof correctAnswer !== 'number' || correctAnswer < 0 || correctAnswer >= options.length) {
            return res.status(400).json({ error: 'correctAnswer must be a valid index within options' });
        }

        const input: TopikQuestionInput = {
            question: question || 'The question is in the image.',
            options,
            correctAnswer,
            type: type || 'general',
            imageUrl
        };

        const result = await analyzeTopikQuestion(input);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[AI Controller] Error:', error);
        if (error instanceof Error) {
            console.error('[AI Controller] Stack:', error.stack);
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            error: message
        });
    }
};

/**
 * POST /api/ai/analyze-sentence
 * 分析韩语句子的词汇、语法和语感
 */
export const analyzeSentenceHandler = async (req: Request, res: Response) => {
    try {
        const { sentence, context, language } = req.body;

        // Validate required field
        if (!sentence || typeof sentence !== 'string' || sentence.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'sentence is required and must be a non-empty string'
            });
        }

        const input: SentenceAnalysisInput = {
            sentence: sentence.trim(),
            context: context?.trim(),
            language: language || 'zh'
        };

        const result = await analyzeSentence(input);

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[AI Controller] Sentence analysis error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({
            success: false,
            error: message
        });
    }
};
