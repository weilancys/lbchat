import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/conversations
router.get('/', async (req, res, next) => {
    try {
        const conversations = await prisma.conversation.findMany({
            where: {
                members: {
                    some: { userId: req.user.id }
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true,
                                isOnline: true
                            }
                        }
                    }
                },
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        content: true,
                        type: true,
                        createdAt: true,
                        sender: {
                            select: {
                                id: true,
                                displayName: true
                            }
                        }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.json({ conversations });
    } catch (error) {
        next(error);
    }
});

// POST /api/conversations
router.post('/', async (req, res, next) => {
    try {
        const createSchema = z.object({
            type: z.enum(['DIRECT', 'GROUP']).default('DIRECT'),
            name: z.string().min(1).max(50).optional(),
            memberIds: z.array(z.string().uuid()).min(1)
        });

        const data = createSchema.parse(req.body);

        // For direct conversations, check if one already exists
        if (data.type === 'DIRECT' && data.memberIds.length === 1) {
            const existingConversation = await prisma.conversation.findFirst({
                where: {
                    type: 'DIRECT',
                    AND: [
                        { members: { some: { userId: req.user.id } } },
                        { members: { some: { userId: data.memberIds[0] } } }
                    ]
                },
                include: {
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    displayName: true,
                                    avatarUrl: true,
                                    isOnline: true
                                }
                            }
                        }
                    }
                }
            });

            if (existingConversation) {
                return res.json({ conversation: existingConversation });
            }
        }

        // Create new conversation
        const conversation = await prisma.conversation.create({
            data: {
                type: data.type,
                name: data.name,
                createdBy: req.user.id,
                members: {
                    create: [
                        { userId: req.user.id, role: 'ADMIN' },
                        ...data.memberIds.map(id => ({ userId: id, role: 'MEMBER' }))
                    ]
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true,
                                isOnline: true
                            }
                        }
                    }
                }
            }
        });

        res.status(201).json({ conversation });
    } catch (error) {
        next(error);
    }
});

// GET /api/conversations/:id
router.get('/:id', async (req, res, next) => {
    try {
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: req.params.id,
                members: { some: { userId: req.user.id } }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true,
                                isOnline: true
                            }
                        }
                    }
                }
            }
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json({ conversation });
    } catch (error) {
        next(error);
    }
});

// PUT /api/conversations/:id
router.put('/:id', async (req, res, next) => {
    try {
        const updateSchema = z.object({
            name: z.string().min(1).max(50).optional(),
            avatarUrl: z.string().url().optional()
        });

        const data = updateSchema.parse(req.body);

        // Check if user is admin
        const member = await prisma.conversationMember.findFirst({
            where: {
                conversationId: req.params.id,
                userId: req.user.id,
                role: 'ADMIN'
            }
        });

        if (!member) {
            return res.status(403).json({ error: 'Only admins can update conversation' });
        }

        const conversation = await prisma.conversation.update({
            where: { id: req.params.id },
            data,
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true
                            }
                        }
                    }
                }
            }
        });

        res.json({ conversation });
    } catch (error) {
        next(error);
    }
});

// POST /api/conversations/:id/members
router.post('/:id/members', async (req, res, next) => {
    try {
        const addMemberSchema = z.object({
            userId: z.string().uuid()
        });

        const data = addMemberSchema.parse(req.body);

        // Check if user is member
        const isMember = await prisma.conversationMember.findFirst({
            where: {
                conversationId: req.params.id,
                userId: req.user.id
            }
        });

        if (!isMember) {
            return res.status(403).json({ error: 'Not a member of this conversation' });
        }

        // Add member
        await prisma.conversationMember.create({
            data: {
                conversationId: req.params.id,
                userId: data.userId,
                role: 'MEMBER'
            }
        });

        res.status(201).json({ message: 'Member added' });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/conversations/:id/members/:userId
router.delete('/:id/members/:userId', async (req, res, next) => {
    try {
        // Check if user is admin or removing themselves
        const isAdmin = await prisma.conversationMember.findFirst({
            where: {
                conversationId: req.params.id,
                userId: req.user.id,
                role: 'ADMIN'
            }
        });

        const isSelf = req.params.userId === req.user.id;

        if (!isAdmin && !isSelf) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await prisma.conversationMember.deleteMany({
            where: {
                conversationId: req.params.id,
                userId: req.params.userId
            }
        });

        res.json({ message: 'Member removed' });
    } catch (error) {
        next(error);
    }
});

export default router;
