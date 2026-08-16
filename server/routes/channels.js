const express = require('express');
const prisma = require('../prismaClient');
const authMiddleware = require('../middleware/authMiddleware');
const { checkSpam } = require('../utils');

const router = express.Router();

// Get last 50 messages for a channel (oldest first)
router.get('/:channelId/messages', authMiddleware, async (req, res) => {
    try {
        const { channelId } = req.params;

        const rawMessages = await prisma.message.findMany({
            where: { channelId },
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: {
                sender: {
                    select: { id: true, username: true, avatarUrl: true }
                }
            }
        });

        const messages = rawMessages.reverse().map(m => ({
            ...m,
            isSuspicious: checkSpam(m.content)
        }));

        res.json({ messages });
    } catch (error) {
        console.error('Error fetching channel messages:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

module.exports = router;
