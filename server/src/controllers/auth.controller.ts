import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

// Helper to format user for frontend
const formatUser = (user: any) => {
    const formattedHistory = user.examHistory.map((h: any) => ({
        ...h,
        timestamp: h.timestamp.getTime(),
        userAnswers: JSON.parse(h.userAnswers)
    }));

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        tier: user.tier,
        role: user.role,
        joinDate: user.createdAt.getTime(),
        lastActive: Date.now(),
        savedWords: user.savedWords,
        mistakes: user.mistakes,
        annotations: user.annotations.map((a: any) => ({
            ...a, 
            timestamp: a.createdAt.getTime() 
        })),
        examHistory: formattedHistory,
        statistics: {
            wordsLearned: user.savedWords.length,
            readingsCompleted: 0,
            listeningHours: 0,
            dayStreak: 1,
            activityLog: []
        }
    };
};

export const register = async (req: any, res: any) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'STUDENT',
        tier: 'FREE'
      }
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // For register, we return a basic user structure since relations are empty
    res.json({ token, user: { ...user, password: undefined, savedWords: [], mistakes: [], annotations: [], examHistory: [] } });

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

export const login = async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ 
        where: { email },
        include: {
            savedWords: true,
            mistakes: true,
            annotations: true,
            examHistory: true
        } 
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: formatUser(user) });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

export const getMe = async (req: any, res: any) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                savedWords: true,
                mistakes: true,
                annotations: true,
                examHistory: true
            }
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ user: formatUser(user) });
    } catch (error) {
        console.error("GetMe Error:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
};