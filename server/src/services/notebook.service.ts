import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { uploadJSON, downloadJSON, deleteFile } from './storage.service';

export interface SaveNoteInput {
    type: string;       // "VOCAB", "GRAMMAR", "MISTAKE"
    title: string;
    content: any;       // Full JSON content to store in S3
    tags?: string[];
}

export interface NoteMeta {
    id: string;
    type: string;
    title: string;
    preview: string | null;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface NoteDetail extends NoteMeta {
    content: any;       // Full content from S3
}

/**
 * 生成 S3 存储路径
 */
const generateStorageKey = (userId: string): string => {
    return `notebook/${userId}/${uuidv4()}.json`;
};

/**
 * 从 content 提取预览文本
 */
const extractPreview = (content: any): string => {
    if (typeof content === 'string') {
        return content.slice(0, 200);
    }
    // 尝试常见字段
    const preview = content.meaning || content.translation || content.definition || content.summary || '';
    return typeof preview === 'string' ? preview.slice(0, 200) : '';
};

/**
 * 保存笔记
 */
export const saveNote = async (userId: string, data: SaveNoteInput): Promise<NoteMeta> => {
    const { type, title, content, tags = [] } = data;

    // 1. 生成 S3 Key
    const storageKey = generateStorageKey(userId);

    // 2. 上传完整内容到 S3
    await uploadJSON(storageKey, content);

    // 3. 提取预览文本
    const preview = extractPreview(content);

    // 4. 保存元数据到数据库
    const entry = await prisma.notebookEntry.create({
        data: {
            userId,
            type,
            title,
            storageKey,
            preview,
            tags,
        },
    });

    return {
        id: entry.id,
        type: entry.type,
        title: entry.title,
        preview: entry.preview,
        tags: entry.tags,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
    };
};

/**
 * 获取笔记列表（仅元数据，不读取 S3）
 */
export const getNotes = async (
    userId: string,
    filter?: { type?: string }
): Promise<NoteMeta[]> => {
    const where: any = { userId };
    if (filter?.type) {
        where.type = filter.type;
    }

    const entries = await prisma.notebookEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            type: true,
            title: true,
            preview: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return entries;
};

/**
 * 获取笔记详情（包含 S3 完整内容）
 */
export const getNoteDetail = async (
    userId: string,
    noteId: string
): Promise<NoteDetail | null> => {
    // 1. 查询数据库
    const entry = await prisma.notebookEntry.findFirst({
        where: {
            id: noteId,
            userId, // 验证所有权
        },
    });

    if (!entry) {
        return null;
    }

    // 2. 从 S3 下载完整内容
    const content = await downloadJSON(entry.storageKey);

    return {
        id: entry.id,
        type: entry.type,
        title: entry.title,
        preview: entry.preview,
        tags: entry.tags,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        content,
    };
};

/**
 * 删除笔记
 */
export const deleteNote = async (userId: string, noteId: string): Promise<boolean> => {
    // 1. 查询并验证所有权
    const entry = await prisma.notebookEntry.findFirst({
        where: {
            id: noteId,
            userId,
        },
    });

    if (!entry) {
        return false;
    }

    // 2. 删除 S3 文件
    try {
        await deleteFile(entry.storageKey);
    } catch (e) {
        console.warn('[Notebook] Failed to delete S3 file:', entry.storageKey, e);
        // 即使 S3 删除失败，仍然删除数据库记录
    }

    // 3. 删除数据库记录
    await prisma.notebookEntry.delete({
        where: { id: noteId },
    });

    return true;
};
