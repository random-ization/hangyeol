import { Router } from 'express';
import {
    getAnnotations,
    saveAnnotation,
    deleteAnnotation,
} from '../controllers/annotation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// 所有批注操作都需要登录
router.get('/', authenticate, getAnnotations);
router.post('/', authenticate, saveAnnotation);
router.delete('/:id', authenticate, deleteAnnotation);

export default router;
