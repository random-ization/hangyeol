import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { TTSService } from '../services/tts.service';

export class AdminVocabController {
    // GET /api/admin/vocab
    static async getList(req: Request, res: Response) {
        try {
            const { courseId, page = 1, limit = 50, search, missingAudio, missingExample } = req.query;

            if (!courseId) return res.status(400).json({ error: 'courseId is required' });

            const where: any = { courseId: String(courseId) };

            if (search) {
                where.OR = [
                    { word: { contains: String(search), mode: 'insensitive' } },
                    { meaning: { contains: String(search), mode: 'insensitive' } },
                ];
            }

            if (missingAudio === 'true') {
                where.audioUrl = null;
            }

            if (missingExample === 'true') {
                where.OR = [
                    { exampleSentence: null },
                    { exampleSentence: '' }
                ];
            }

            const skip = (Number(page) - 1) * Number(limit);

            const [total, items] = await Promise.all([
                prisma.vocabulary.count({ where }),
                prisma.vocabulary.findMany({
                    where,
                    skip,
                    take: Number(limit),
                    orderBy: [
                        { unitId: 'asc' },
                        { createdAt: 'desc' },
                    ],
                }),
            ]);

            res.json({ success: true, total, pages: Math.ceil(total / Number(limit)), items });
        } catch (error) {
            console.error('Get Vocab List Error:', error);
            res.status(500).json({ error: 'Failed to fetch vocabulary list' });
        }
    }

    // POST /api/admin/vocab/bulk
    static async bulkImport(req: Request, res: Response) {
        try {
            const { items } = req.body;
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ error: 'Invalid items array' });
            }

            const results = { success: 0, failed: 0, errors: [] as string[] };

            for (const item of items) {
                try {
                    // Validate required
                    if (!item.courseId || !item.word || !item.meaning || item.unitId === undefined) {
                        // If courseId is missing in item, maybe use a default or fail?
                        // The frontend should inject courseId into every item
                        throw new Error(`Missing required fields for ${item.word || 'unknown'}`);
                    }

                    await prisma.vocabulary.upsert({
                        where: {
                            courseId_word: {
                                courseId: item.courseId,
                                word: item.word
                            }
                        },
                        update: {
                            unitId: Number(item.unitId),
                            meaning: item.meaning,
                            partOfSpeech: item.partOfSpeech || 'NOUN',
                            hanja: item.hanja,
                            exampleSentence: item.exampleSentence,
                            exampleMeaning: item.exampleMeaning,
                            tips: item.tips,
                        },
                        create: {
                            courseId: item.courseId,
                            unitId: Number(item.unitId),
                            word: item.word,
                            meaning: item.meaning,
                            partOfSpeech: item.partOfSpeech || 'NOUN',
                            hanja: item.hanja,
                            exampleSentence: item.exampleSentence,
                            exampleMeaning: item.exampleMeaning,
                            tips: item.tips,
                        }
                    });
                    results.success++;
                } catch (e: any) {
                    results.failed++;
                    results.errors.push(`${item.word}: ${e.message}`);
                }
            }

            res.json({ success: true, results });
        } catch (error) {
            console.error('Bulk Import Error:', error);
            res.status(500).json({ error: 'Import failed' });
        }
    }

    // PATCH /api/admin/vocab/:id
    static async updateItem(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const data = req.body;
            const updated = await prisma.vocabulary.update({
                where: { id },
                data
            });
            res.json({ success: true, item: updated });
        } catch (error) {
            console.error('Update Item Error:', error);
            res.status(500).json({ error: 'Update failed' });
        }
    }

    // DELETE /api/admin/vocab/:id
    static async deleteItem(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await prisma.vocabulary.delete({ where: { id } });
            res.json({ success: true });
        } catch (error) {
            console.error('Delete Item Error:', error);
            res.status(500).json({ error: 'Delete failed' });
        }
    }

    // POST /api/admin/vocab/:id/tts
    static async generateAudio(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const vocab = await prisma.vocabulary.findUnique({ where: { id } });
            if (!vocab) return res.status(404).json({ error: 'Vocab not found' });

            const url = await TTSService.generate(vocab.word);

            const updated = await prisma.vocabulary.update({
                where: { id },
                data: { audioUrl: url }
            });

            res.json({ success: true, audioUrl: url, item: updated });
        } catch (error) {
            console.error('Generate Audio Error:', error);
            res.status(500).json({ error: 'Generation failed' });
        }
    }

    // POST /api/admin/vocab/:id/upload
    static async uploadAudio(req: Request, res: Response) {
        try {
            if (!req.file || !(req.file as any).location) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            const { id } = req.params;
            const url = (req.file as any).location;

            const updated = await prisma.vocabulary.update({
                where: { id },
                data: { audioUrl: url }
            });

            res.json({ success: true, audioUrl: url, item: updated });
        } catch (error) {
            console.error('Upload Audio Error:', error);
            res.status(500).json({ error: 'Upload failed' });
        }
    }
}
