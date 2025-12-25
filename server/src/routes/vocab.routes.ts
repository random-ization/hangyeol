import { Router } from 'express';
import { PrismaClient, WordStatus } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/vocab/session - Fetch study session words
// Priority: 1. Due reviews, 2. Learning, 3. New words
router.get('/session', async (req, res) => {
    try {
        const { userId, courseId, unitId, limit = 20 } = req.query;

        if (!userId || !courseId) {
            return res.status(400).json({ error: 'userId and courseId are required' });
        }

        const now = new Date();
        const limitNum = parseInt(limit as string, 10);

        // Build unit filter
        const unitFilter: any = {};
        if (unitId && unitId !== 'ALL') {
            const parsedUnit = parseInt(unitId as string, 10);
            if (!isNaN(parsedUnit)) {
                unitFilter.unitId = parsedUnit;
            }
        }

        // 1. Due reviews (nextReviewAt <= NOW) - highest priority
        const dueReviews = await prisma.userWordProgress.findMany({
            where: {
                userId: userId as string,
                nextReviewAt: { lte: now },
                vocabulary: {
                    courseId: courseId as string,
                    ...unitFilter,
                },
            },
            include: { vocabulary: true },
            orderBy: { nextReviewAt: 'asc' },
            take: limitNum,
        });

        type SessionWord = {
            id: string;
            courseId: string;
            unitId: string;
            word: string;
            meaning: string;
            pronunciation: string | null;
            audioUrl: string | null;
            hanja: string | null;
            partOfSpeech: any;
            tips: any;
            exampleSentence: string | null;
            exampleMeaning: string | null;
            createdAt: Date;
            updatedAt: Date;
            progress: {
                id: string;
                status: string;
                interval: number;
                streak: number;
                nextReviewAt: Date | null;
            } | null;
        };

        let sessionWords: SessionWord[] = dueReviews.map(p => {
            // Force type cast because Prisma findMany inference with include is tricky here
            const vocab = (p as any).vocabulary;
            return {
                ...vocab,
                progress: {
                    id: p.id,
                    status: p.status,
                    interval: p.interval,
                    streak: p.streak,
                    nextReviewAt: p.nextReviewAt,
                },
            };
        });

        // 2. Learning words (if still need more)
        if (sessionWords.length < limitNum) {
            const remaining = limitNum - sessionWords.length;
            const existingIds = sessionWords.map(w => w.id);

            const learningWords = await prisma.userWordProgress.findMany({
                where: {
                    userId: userId as string,
                    status: 'LEARNING',
                    vocabularyId: { notIn: existingIds },
                    vocabulary: {
                        courseId: courseId as string,
                        ...unitFilter,
                    },
                },
                include: { vocabulary: true },
                take: remaining,
            });

            sessionWords.push(...learningWords.map(p => ({
                ...p.vocabulary,
                progress: {
                    id: p.id,
                    status: p.status,
                    interval: p.interval,
                    streak: p.streak,
                    nextReviewAt: p.nextReviewAt,
                },
            } as any)));
        }

        // 3. New words (no progress record yet)
        if (sessionWords.length < limitNum) {
            const remaining = limitNum - sessionWords.length;
            const existingIds = sessionWords.map(w => w.id);

            // Find vocab IDs that user already has progress for
            const existingProgress = await prisma.userWordProgress.findMany({
                where: {
                    userId: userId as string,
                    vocabulary: {
                        courseId: courseId as string,
                        ...unitFilter,
                    },
                },
                select: { vocabularyId: true },
            });
            const progressIds = existingProgress.map(p => p.vocabularyId);

            const newWords = await prisma.vocabulary.findMany({
                where: {
                    courseId: courseId as string,
                    ...unitFilter,
                    id: { notIn: [...existingIds, ...progressIds] },
                },
                take: remaining,
            });

            sessionWords.push(...newWords.map(v => ({
                ...v,
                progress: null, // No progress yet
            } as any)));
        }

        res.json({
            success: true,
            session: sessionWords,
            stats: {
                total: sessionWords.length,
                dueReviews: dueReviews.length,
            },
        });
    } catch (error) {
        console.error('Error fetching vocab session:', error);
        res.status(500).json({ error: 'Failed to fetch vocab session' });
    }
});

// POST /api/vocab/progress - Update SRS progress
router.post('/progress', async (req, res) => {
    try {
        const { userId, vocabularyId, quality } = req.body;

        if (!userId || !vocabularyId || quality === undefined) {
            return res.status(400).json({ error: 'userId, vocabularyId, and quality are required' });
        }

        // quality: 0 = Forgot, 5 = Remember/Easy
        const qualityNum = parseInt(quality, 10);
        const now = new Date();

        // Find or create progress record
        let progress = await prisma.userWordProgress.findUnique({
            where: {
                userId_vocabularyId: { userId, vocabularyId },
            },
        });

        let newStatus: WordStatus;
        let newInterval: number;
        let newEaseFactor: number;
        let newStreak: number;
        let newMistakeCount: number;

        if (!progress) {
            // First time reviewing this word
            progress = {
                id: '',
                userId,
                vocabularyId,
                status: 'NEW',
                nextReviewAt: null,
                interval: 0,
                easeFactor: 2.5,
                streak: 0,
                lastReviewedAt: null,
                mistakeCount: 0,
            };
        }

        // SM-2 Algorithm
        if (qualityNum === 0) {
            // Forgot
            newStatus = 'LEARNING';
            newInterval = 1;
            newEaseFactor = Math.max(1.3, progress.easeFactor - 0.2);
            newStreak = 0;
            newMistakeCount = progress.mistakeCount + 1;
        } else {
            // Know (quality >= 3)
            newMistakeCount = progress.mistakeCount;

            if (progress.status === 'NEW') {
                // First time "Know" - set interval to 1 day
                newStatus = 'LEARNING';
                newInterval = 1;
                newEaseFactor = progress.easeFactor;
                newStreak = 1;
            } else if (progress.status === 'LEARNING') {
                // Learning phase - increment interval
                newInterval = progress.interval + 1;
                newStreak = progress.streak + 1;
                newEaseFactor = progress.easeFactor;

                if (newInterval >= 3) {
                    newStatus = 'REVIEW';
                } else {
                    newStatus = 'LEARNING';
                }
            } else {
                // Review phase - multiply by ease factor
                newInterval = Math.round(progress.interval * progress.easeFactor);
                newStreak = progress.streak + 1;
                newEaseFactor = Math.min(2.5, progress.easeFactor + 0.1);

                if (newInterval > 30) {
                    newStatus = 'MASTERED';
                } else {
                    newStatus = 'REVIEW';
                }
            }
        }

        // Calculate next review date (UTC)
        const nextReviewAt = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

        // Upsert progress
        const updated = await prisma.userWordProgress.upsert({
            where: {
                userId_vocabularyId: { userId, vocabularyId },
            },
            update: {
                status: newStatus,
                interval: newInterval,
                easeFactor: newEaseFactor,
                streak: newStreak,
                mistakeCount: newMistakeCount,
                nextReviewAt,
                lastReviewedAt: now,
            },
            create: {
                userId,
                vocabularyId,
                status: newStatus,
                interval: newInterval,
                easeFactor: newEaseFactor,
                streak: newStreak,
                mistakeCount: newMistakeCount,
                nextReviewAt,
                lastReviewedAt: now,
            },
        });

        res.json({
            success: true,
            progress: updated,
        });
    } catch (error) {
        console.error('Error updating vocab progress:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

// GET /api/vocab/words - Get all vocabulary for a course
router.get('/words', async (req, res) => {
    try {
        const { courseId, unitId } = req.query;

        if (!courseId) {
            return res.status(400).json({ error: 'courseId is required' });
        }

        const unitFilter: any = {};
        if (unitId && unitId !== 'ALL') {
            const parsedUnit = parseInt(unitId as string, 10);
            if (!isNaN(parsedUnit)) {
                unitFilter.unitId = parsedUnit;
            }
        }

        const words = await prisma.vocabulary.findMany({
            where: {
                courseId: courseId as string,
                ...unitFilter,
            },
            orderBy: [{ unitId: 'asc' }, { word: 'asc' }],
        });

        res.json({ success: true, words });
    } catch (error) {
        console.error('Error fetching vocab words:', error);
        res.status(500).json({ error: 'Failed to fetch words' });
    }
});

export default router;
