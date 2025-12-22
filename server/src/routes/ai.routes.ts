import { Router } from 'express';
import { analyzeQuestion, analyzeSentenceHandler } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// POST /api/ai/analyze-question - 分析 TOPIK 题目
router.post('/analyze-question', authenticate, analyzeQuestion);

// POST /api/ai/analyze-sentence - 分析韩语句子
router.post('/analyze-sentence', authenticate, analyzeSentenceHandler);

export default router;
