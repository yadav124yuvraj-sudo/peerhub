const express = require('express');
const prisma = require('../prismaClient');
const authMiddleware = require('../middleware/authMiddleware');
const { getBadge } = require('../utils');

const router = express.Router();

// Get all servers joined by logged-in user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const memberships = await prisma.serverMember.findMany({
            where: { userId: req.userId },
            include: {
                server: {
                    include: {
                        channels: true
                    }
                }
            }
        });

        const servers = memberships.map(m => m.server);
        res.json({ servers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Create a new server
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Server name is required' });
        }

        const server = await prisma.server.create({
            data: {
                name,
                description,
                ownerId: req.userId,
                members: {
                    create: { userId: req.userId, role: 'ADMIN' }
                },
                channels: {
                    create: { name: 'general', type: 'TEXT' }
                }
            },
            include: { members: true, channels: true }
        });

        res.status(201).json({ message: 'Server created successfully', server });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Join a server using invite code
router.post('/join/:inviteCode', authMiddleware, async (req, res) => {
    try {
        const { inviteCode } = req.params;

        const server = await prisma.server.findUnique({ where: { inviteCode } });

        if (!server) {
            return res.status(404).json({ error: 'Invalid invite code' });
        }

        const existingMember = await prisma.serverMember.findUnique({
            where: { serverId_userId: { serverId: server.id, userId: req.userId } }
        });

        if (existingMember) {
            return res.status(400).json({ error: 'You are already a member of this server' });
        }

        const member = await prisma.serverMember.create({
            data: { serverId: server.id, userId: req.userId, role: 'MEMBER' }
        });

        res.status(201).json({ message: 'Joined server successfully', server, member });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Get server leaderboard
router.get('/:id/leaderboard', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const members = await prisma.serverMember.findMany({
            where: { serverId: id },
            include: {
                user: { select: { id: true, username: true, avatarUrl: true, totalPoints: true } }
            }
        });

        const leaderboard = members
            .map(m => ({
                userId: m.user.id,
                username: m.user.username,
                avatarUrl: m.user.avatarUrl,
                totalPoints: m.user.totalPoints,
                badge: getBadge(m.user.totalPoints)
            }))
            .sort((a, b) => b.totalPoints - a.totalPoints);

        res.json({ leaderboard });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Get server details with channels and members
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const server = await prisma.server.findUnique({
            where: { id },
            include: {
                channels: true,
                members: {
                    include: {
                        user: {
                            select: { id: true, username: true, avatarUrl: true, totalPoints: true }
                        }
                    }
                }
            }
        });

        if (!server) {
            return res.status(404).json({ error: 'Server not found' });
        }

        const isMember = server.members.some(m => m.userId === req.userId);
        if (!isMember) {
            return res.status(403).json({ error: 'You are not a member of this server' });
        }

        res.json({ server });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Create a new channel in a server (Admin only)
router.post('/:id/channels', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Channel name is required' });
        }

        // Check if user is an ADMIN of the server
        const member = await prisma.serverMember.findUnique({
            where: {
                serverId_userId: { serverId: id, userId: req.userId }
            }
        });

        if (!member || member.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only server admins can create channels' });
        }

        const channel = await prisma.channel.create({
            data: {
                serverId: id,
                name: name.toLowerCase().replace(/\s+/g, '-'),
                type: type || 'TEXT'
            }
        });

        res.status(201).json({ message: 'Channel created successfully', channel });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

module.exports = router;