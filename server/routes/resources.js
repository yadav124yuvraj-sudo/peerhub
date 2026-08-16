const express = require('express');
const multer = require('multer');
const streamifier = require('streamifier');
const prisma = require('../prismaClient');
const cloudinary = require('../cloudinaryConfig');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload a resource
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { serverId, title, tags } = req.body;

        if (!serverId || !title || !req.file) {
            return res.status(400).json({ error: 'serverId, title, and file are required' });
        }

        const streamUpload = () => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'peerhub_resources', resource_type: 'auto' },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        const result = await streamUpload();

        const resource = await prisma.resource.create({
            data: {
                serverId,
                uploaderId: req.userId,
                title,
                fileUrl: result.secure_url,
                tags: tags || null
            }
        });

        res.status(201).json({ message: 'Resource uploaded successfully', resource });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Get all resources for a server (with optional search/tag filter)
router.get('/server/:serverId', authMiddleware, async (req, res) => {
    try {
        const { serverId } = req.params;
        const { search, tag } = req.query;

        const resources = await prisma.resource.findMany({
            where: {
                serverId,
                ...(search && { title: { contains: search, mode: 'insensitive' } }),
                ...(tag && { tags: { contains: tag, mode: 'insensitive' } })
            },
            include: {
                uploader: { select: { id: true, username: true, avatarUrl: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ resources });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Download a resource (increments count + awards points)
router.post('/:id/download', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const resource = await prisma.resource.findUnique({ where: { id } });
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        await prisma.$transaction([
            prisma.resource.update({
                where: { id },
                data: { downloads: { increment: 1 } }
            }),
            prisma.user.update({
                where: { id: resource.uploaderId },
                data: { totalPoints: { increment: 1 } }
            }),
            prisma.pointsLog.create({
                data: { userId: resource.uploaderId, actionType: 'resource_download', points: 1 }
            })
        ]);

        res.json({ message: 'Download recorded', fileUrl: resource.fileUrl });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Upvote a resource (awards points)
router.post('/:id/upvote', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const resource = await prisma.resource.findUnique({ where: { id } });
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        await prisma.$transaction([
            prisma.resource.update({
                where: { id },
                data: { upvotes: { increment: 1 } }
            }),
            prisma.user.update({
                where: { id: resource.uploaderId },
                data: { totalPoints: { increment: 3 } }
            }),
            prisma.pointsLog.create({
                data: { userId: resource.uploaderId, actionType: 'resource_upvote', points: 3 }
            })
        ]);

        res.json({ message: 'Upvoted successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

module.exports = router;