import { Router } from 'express';
import {
    getTodayPhrase,
    getAllPhrases,
    createPhrase,
    updatePhrase,
    deletePhrase,
} from '../controllers/dailyPhrase.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Public route - Get today's phrase
router.get('/today', getTodayPhrase);

// Admin routes - Manage phrases
router.get('/all', authenticate, requireAdmin, getAllPhrases);
router.post('/', authenticate, requireAdmin, createPhrase);
router.put('/:id', authenticate, requireAdmin, updatePhrase);
router.delete('/:id', authenticate, requireAdmin, deletePhrase);

export default router;
