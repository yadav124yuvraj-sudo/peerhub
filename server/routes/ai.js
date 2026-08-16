const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const prisma = require('../prismaClient');
const authMiddleware = require('../middleware/authMiddleware');
require('dotenv').config();

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get AI summary of recent messages in a channel
router.get('/summary/:channelId', authMiddleware, async (req, res) => {
  try {
    const { channelId } = req.params;

    const messages = await prisma.message.findMany({
      where: { channelId },
      include: { sender: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    if (messages.length === 0) {
      return res.json({ summary: 'No messages to summarize yet.' });
    }

    const chatText = messages
      .reverse()
      .map(m => `${m.sender.username}: ${m.content}`)
      .join('\n');

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `Summarize this chat conversation into key points and decisions. Keep it short and clear:\n\n${chatText}`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    res.json({ summary });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong generating summary' });
  }
});

module.exports = router;
