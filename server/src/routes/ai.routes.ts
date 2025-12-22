import { Router } from 'express';
import {
    analyzeQuestion,
    analyzeSentenceHandler,
    generateTranscriptHandler,
    checkTranscriptHandler,
    deleteTranscriptHandler
} from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// POST /api/ai/analyze-question - 分析 TOPIK 题目
router.post('/analyze-question', authenticate, analyzeQuestion);

// POST /api/ai/analyze-sentence - 分析韩语句子
router.post('/analyze-sentence', authenticate, analyzeSentenceHandler);

// POST /api/ai/transcript - 生成播客字幕
router.post('/transcript', authenticate, generateTranscriptHandler);

// GET /api/ai/transcript/:episodeId - 检查字幕缓存
router.get('/transcript/:episodeId', authenticate, checkTranscriptHandler);

// DELETE /api/ai/transcript/:episodeId - 删除字幕缓存
router.delete('/transcript/:episodeId', authenticate, deleteTranscriptHandler);

export default router;
