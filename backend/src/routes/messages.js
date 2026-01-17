import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/conversations/:conversationId/messages
router.get('/conversations/:conversationId/messages', async (req, res, next) => {
    try {
        const { cursor, limit = 50 } = req.query;

        // Check membership
        const isMember = await prisma.conversationMember.findFirst({
            where: {
                conversationId: req.params.conversationId,
                userId: req.user.id
            }
        });

        if (!isMember) {
            return res.status(403).json({ error: 'Not a member of this conversation' });
        }

        const messages = await prisma.message.findMany({
            where: {
                conversationId: req.params.conversationId,
                isDeleted: false
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                },
                file: {
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        mimeType: true,
                        size: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            ...(cursor && {
                cursor: { id: cursor },
                skip: 1
            })
        });

        // Update last read
        await prisma.conversationMember.updateMany({
            where: {
                conversationId: req.params.conversationId,
                userId: req.user.id
            },
            data: { lastReadAt: new Date() }
        });

        res.json({
            messages: messages.reverse(),
            nextCursor: messages.length === parseInt(limit) ? messages[0]?.id : null
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/conversations/:conversationId/messages
router.post('/conversations/:conversationId/messages', async (req, res, next) => {
    try {
        const createSchema = z.object({
            content: z.string().max(5000).optional(),
            type: z.enum(['TEXT', 'IMAGE', 'FILE']).default('TEXT'),
            fileId: z.string().uuid().optional()
        });

        const data = createSchema.parse(req.body);

        // Check membership
        const isMember = await prisma.conversationMember.findFirst({
            where: {
                conversationId: req.params.conversationId,
                userId: req.user.id
            }
        });

        if (!isMember) {
            return res.status(403).json({ error: 'Not a member of this conversation' });
        }

        // Create message
        const message = await prisma.message.create({
            data: {
                conversationId: req.params.conversationId,
                senderId: req.user.id,
                content: data.content,
                type: data.type,
                fileId: data.fileId
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                },
                file: {
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        mimeType: true,
                        size: true
                    }
                }
            }
        });

        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id: req.params.conversationId },
            data: { updatedAt: new Date() }
        });

        res.status(201).json({ message });
    } catch (error) {
        next(error);
    }
});

// PUT /api/messages/:id
router.put('/:id', async (req, res, next) => {
    try {
        const updateSchema = z.object({
            content: z.string().min(1).max(5000)
        });

        const data = updateSchema.parse(req.body);

        // Check ownership
        const existingMessage = await prisma.message.findUnique({
            where: { id: req.params.id }
        });

        if (!existingMessage || existingMessage.senderId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to edit this message' });
        }

        const message = await prisma.message.update({
            where: { id: req.params.id },
            data: {
                content: data.content,
                isEdited: true
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        res.json({ message });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/messages/:id
router.delete('/:id', async (req, res, next) => {
    try {
        // Check ownership
        const existingMessage = await prisma.message.findUnique({
            where: { id: req.params.id }
        });

        if (!existingMessage || existingMessage.senderId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this message' });
        }

        // Soft delete
        await prisma.message.update({
            where: { id: req.params.id },
            data: { isDeleted: true }
        });

        res.json({ message: 'Message deleted' });
    } catch (error) {
        next(error);
    }
});

export default router;
