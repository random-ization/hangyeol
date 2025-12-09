import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get today's daily phrase based on the current date
 * Algorithm: Use day of year (1-365) to select the phrase
 */
export const getTodayPhrase = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);

        // Get total number of phrases
        const totalPhrases = await prisma.dailyPhrase.count();

        if (totalPhrases === 0) {
            return res.status(404).json({ error: 'No daily phrases available' });
        }

        // Calculate which phrase to show (rotating through available phrases)
        const targetIndex = (dayOfYear % totalPhrases) + 1;

        // Find phrase by dayIndex, or fallback to any phrase if not found
        let phrase = await prisma.dailyPhrase.findUnique({
            where: { dayIndex: targetIndex },
        });

        // Fallback: if no phrase for this index, get the first available
        if (!phrase) {
            phrase = await prisma.dailyPhrase.findFirst({
                orderBy: { dayIndex: 'asc' },
            });
        }

        res.json(phrase);
    } catch (error) {
        console.error('Error fetching today\'s phrase:', error);
        res.status(500).json({ error: 'Failed to fetch daily phrase' });
    }
};

/**
 * Get all daily phrases (Admin only)
 */
export const getAllPhrases = async (req: Request, res: Response) => {
    try {
        const phrases = await prisma.dailyPhrase.findMany({
            orderBy: { dayIndex: 'asc' },
        });
        res.json(phrases);
    } catch (error) {
        console.error('Error fetching all phrases:', error);
        res.status(500).json({ error: 'Failed to fetch phrases' });
    }
};

/**
 * Create a new daily phrase (Admin only)
 */
export const createPhrase = async (req: Request, res: Response) => {
    try {
        const { korean, romanization, chinese, english, dayIndex } = req.body;

        if (!korean || !romanization || !chinese || !dayIndex) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const phrase = await prisma.dailyPhrase.create({
            data: {
                korean,
                romanization,
                chinese,
                english,
                dayIndex,
            },
        });

        res.status(201).json(phrase);
    } catch (error: any) {
        console.error('Error creating phrase:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'A phrase with this dayIndex already exists' });
        }
        res.status(500).json({ error: 'Failed to create phrase' });
    }
};

/**
 * Update a daily phrase (Admin only)
 */
export const updatePhrase = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { korean, romanization, chinese, english, dayIndex } = req.body;

        const phrase = await prisma.dailyPhrase.update({
            where: { id },
            data: {
                ...(korean && { korean }),
                ...(romanization && { romanization }),
                ...(chinese && { chinese }),
                ...(english !== undefined && { english }),
                ...(dayIndex && { dayIndex }),
            },
        });

        res.json(phrase);
    } catch (error) {
        console.error('Error updating phrase:', error);
        res.status(500).json({ error: 'Failed to update phrase' });
    }
};

/**
 * Delete a daily phrase (Admin only)
 */
export const deletePhrase = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.dailyPhrase.delete({
            where: { id },
        });

        res.json({ message: 'Phrase deleted successfully' });
    } catch (error) {
        console.error('Error deleting phrase:', error);
        res.status(500).json({ error: 'Failed to delete phrase' });
    }
};
