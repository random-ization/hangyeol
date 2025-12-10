import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// 获取批注/笔记
export const getAnnotations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { targetId, targetType, pageIndex } = req.query;

    if (!targetId || !targetType) {
      return res.status(400).json({ error: 'targetId and targetType are required' });
    }

    const where: any = {
      userId,
      targetId: String(targetId),
      targetType: String(targetType),
    };

    // 如果指定了 pageIndex，只返回该页的笔记
    if (pageIndex !== undefined) {
      where.pageIndex = Number(pageIndex);
    }

    const annotations = await prisma.canvasAnnotation.findMany({
      where,
      orderBy: { pageIndex: 'asc' },
    });

    res.json(annotations);
  } catch (e: any) {
    console.error('Failed to fetch annotations:', e);
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
};

// 保存批注/笔记 (upsert 逻辑)
export const saveAnnotation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { targetId, targetType, pageIndex, data, visibility } = req.body;

    if (!targetId || !targetType || pageIndex === undefined || !data) {
      return res.status(400).json({ 
        error: 'targetId, targetType, pageIndex, and data are required' 
      });
    }

    // 查找是否已有该页的笔记
    const existing = await prisma.canvasAnnotation.findFirst({
      where: {
        userId,
        targetId: String(targetId),
        targetType: String(targetType),
        pageIndex: Number(pageIndex),
      },
    });

    let annotation;
    if (existing) {
      // 更新已有笔记
      annotation = await prisma.canvasAnnotation.update({
        where: { id: existing.id },
        data: {
          data,
          visibility: visibility || 'PRIVATE',
          updatedAt: new Date(),
        },
      });
    } else {
      // 创建新笔记
      annotation = await prisma.canvasAnnotation.create({
        data: {
          userId,
          targetId: String(targetId),
          targetType: String(targetType),
          pageIndex: Number(pageIndex),
          data,
          visibility: visibility || 'PRIVATE',
        },
      });
    }

    res.json(annotation);
  } catch (e: any) {
    console.error('Failed to save annotation:', e);
    res.status(500).json({ error: 'Failed to save annotation' });
  }
};

// 删除批注
export const deleteAnnotation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // 确保用户只能删除自己的笔记
    const annotation = await prisma.canvasAnnotation.findFirst({
      where: { id, userId },
    });

    if (!annotation) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    await prisma.canvasAnnotation.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    console.error('Failed to delete annotation:', e);
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
};
