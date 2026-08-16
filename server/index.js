const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const resourceRoutes = require('./routes/resources');
const doubtRoutes = require('./routes/doubts');
const aiRoutes = require('./routes/ai');
const channelRoutes = require('./routes/channels');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/doubts', doubtRoutes);
app.use('/api/ai', aiRoutes);


app.get('/', (req, res) => {
    res.send('PeerHub backend is running!');
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: { origin: '*' }
});

const prisma = require('./prismaClient');
const { checkSpam } = require('./utils');

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_channel', (channelId) => {
        socket.join(channelId);
        console.log(`Socket ${socket.id} joined channel ${channelId}`);
    });

    socket.on('send_message', async (data) => {
        try {
            const { channelId, senderId, content } = data;
            const isSuspicious = checkSpam(content);

            const message = await prisma.message.create({
                data: { channelId, senderId, content },
                include: {
                    sender: { select: { id: true, username: true, avatarUrl: true } }
                }
            });

            io.to(channelId).emit('receive_message', { ...message, isSuspicious });
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});