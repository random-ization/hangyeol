import { Router } from 'express';
import { createNote, listNotes, getNote, removeNote } from '../controllers/notebook.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// 所有路由需要认证
router.use(authenticate);

// POST /api/notebook - 保存新笔记
router.post('/', createNote);

// GET /api/notebook - 获取笔记列表
router.get('/', listNotes);

// GET /api/notebook/:id - 获取笔记详情
router.get('/:id', getNote);

// DELETE /api/notebook/:id - 删除笔记
router.delete('/:id', removeNote);

export default router;
