import { Request, Response } from 'express';
import { saveNote, getNotes, getNoteDetail, deleteNote } from '../services/notebook.service';

/**
 * POST /api/notebook
 * 保存新笔记
 */
export const createNote = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { type, title, content, tags } = req.body;

        if (!type || !title || !content) {
            return res.status(400).json({ error: 'type, title, and content are required' });
        }

        const note = await saveNote(userId, { type, title, content, tags });

        res.status(201).json({
            success: true,
            data: note,
        });
    } catch (error) {
        console.error('[Notebook] Create error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
};

/**
 * GET /api/notebook
 * 获取笔记列表（仅元数据）
 */
export const listNotes = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const type = req.query.type as string | undefined;

        const notes = await getNotes(userId, { type });

        res.json({
            success: true,
            data: notes,
        });
    } catch (error) {
        console.error('[Notebook] List error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
};

/**
 * GET /api/notebook/:id
 * 获取笔记详情（包含 S3 完整内容）
 */
export const getNote = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const noteId = req.params.id;

        const note = await getNoteDetail(userId, noteId);

        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.json({
            success: true,
            data: note,
        });
    } catch (error) {
        console.error('[Notebook] Get detail error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
};

/**
 * DELETE /api/notebook/:id
 * 删除笔记
 */
export const removeNote = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const noteId = req.params.id;

        const success = await deleteNote(userId, noteId);

        if (!success) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.json({
            success: true,
            message: 'Note deleted',
        });
    } catch (error) {
        console.error('[Notebook] Delete error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
};
