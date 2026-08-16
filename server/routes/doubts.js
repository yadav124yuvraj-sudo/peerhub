const express = require('express');
const prisma = require('../prismaClient');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Create a new doubt thread
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { serverId, channelId, title } = req.body;

        if (!serverId || !channelId || !title) {
            return res.status(400).json({ error: 'serverId, channelId, and title are required' });
        }

        const thread = await prisma.doubtThread.create({
            data: {
                serverId,
                channelId,
                askedById: req.userId,
                title
            },
            include: {
                askedBy: { select: { id: true, username: true, avatarUrl: true } }
            }
        });

        res.status(201).json({ message: 'Doubt thread created', thread });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Get all doubt threads for a server (with optional status filter)
router.get('/server/:serverId', authMiddleware, async (req, res) => {
    try {
        const { serverId } = req.params;
        const { status } = req.query;

        const threads = await prisma.doubtThread.findMany({
            where: {
                serverId,
                ...(status === 'solved' && { isSolved: true }),
                ...(status === 'open' && { isSolved: false })
            },
            include: {
                askedBy: { select: { id: true, username: true, avatarUrl: true } },
                replies: {
                    include: {
                        repliedBy: { select: { id: true, username: true, avatarUrl: true } }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ threads });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Add a reply to a doubt thread
router.post('/:id/reply', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const reply = await prisma.doubtReply.create({
            data: {
                threadId: id,
                repliedById: req.userId,
                content
            },
            include: {
                repliedBy: { select: { id: true, username: true, avatarUrl: true } }
            }
        });

        res.status(201).json({ message: 'Reply added', reply });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Mark a reply as the accepted answer
router.post('/:threadId/accept/:replyId', authMiddleware, async (req, res) => {
    try {
        const { threadId, replyId } = req.params;

        const reply = await prisma.doubtReply.findUnique({ where: { id: replyId } });
        if (!reply) {
            return res.status(404).json({ error: 'Reply not found' });
        }

        await prisma.$transaction([
            prisma.doubtReply.update({
                where: { id: replyId },
                data: { isAcceptedAnswer: true }
            }),
            prisma.doubtThread.update({
                where: { id: threadId },
                data: { isSolved: true }
            }),
            prisma.user.update({
                where: { id: reply.repliedById },
                data: { totalPoints: { increment: 15 } }
            }),
            prisma.pointsLog.create({
                data: { userId: reply.repliedById, actionType: 'doubt_solved', points: 15 }
            })
        ]);

        res.json({ message: 'Answer accepted successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

module.exports = router;