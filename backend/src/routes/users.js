import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/users/search
router.get('/search', async (req, res, next) => {
    try {
        const query = req.query.q;

        if (!query || query.length < 2) {
            return res.json({ users: [] });
        }

        const users = await prisma.user.findMany({
            where: {
                AND: [
                    { id: { not: req.user.id } },
                    {
                        OR: [
                            { username: { contains: query, mode: 'insensitive' } },
                            { displayName: { contains: query, mode: 'insensitive' } },
                            { email: { contains: query, mode: 'insensitive' } }
                        ]
                    }
                ]
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true
            },
            take: 20
        });

        res.json({ users });
    } catch (error) {
        next(error);
    }
});

// GET /api/users/:id
router.get('/:id', async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true,
                isOnline: true,
                lastSeen: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        next(error);
    }
});

// PUT /api/users/me
router.put('/me', async (req, res, next) => {
    try {
        const updateSchema = z.object({
            displayName: z.string().min(1).max(50).optional(),
            status: z.string().max(100).optional(),
            avatarUrl: z.string().url().optional()
        });

        const data = updateSchema.parse(req.body);

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data,
            select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true
            }
        });

        res.json({ user });
    } catch (error) {
        next(error);
    }
});

export default router;
