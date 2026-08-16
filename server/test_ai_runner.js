const prisma = require('./prismaClient');
const bcrypt = require('bcrypt');

const CHANNEL_ID = '4a74990c-66b2-4595-9c77-4c0f5406fef2';
const TEST_EMAIL = 'test1@example.com';
const TEST_PASSWORD = 'password123';

async function main() {
    console.log('--- STEP 1: LOGIN / ENSURE USER ---');
    
    // Check if test user exists
    let user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (!user) {
        console.log(`User ${TEST_EMAIL} not found, creating...`);
        const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
        user = await prisma.user.create({
            data: {
                username: 'testuser1',
                email: TEST_EMAIL,
                passwordHash
            }
        });
        console.log('Created user:', user.id, user.username);
    } else {
        console.log('User found:', user.id, user.username);
    }

    // Call login API
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    
    const loginData = await loginRes.json();
    console.log('Login Response Status:', loginRes.status);
    console.log('Login Response Data:', loginData);

    if (!loginData.token) {
        console.error('Failed to get token!');
        process.exit(1);
    }

    const token = loginData.token;

    console.log('\n--- STEP 2: CHECK & SEED MESSAGES IN CHANNEL ---');
    // Check channel exists
    let channel = await prisma.channel.findUnique({ where: { id: CHANNEL_ID } });
    if (!channel) {
        console.log(`Channel ${CHANNEL_ID} not found in DB. Searching existing channels...`);
        channel = await prisma.channel.findFirst();
        if (channel) {
            console.log(`Using existing channel ${channel.id} (${channel.name})`);
        } else {
            console.error('No channels found in DB!');
            process.exit(1);
        }
    } else {
        console.log(`Channel ${channel.id} found: ${channel.name}`);
    }

    const targetChannelId = channel.id;

    // Check message count
    const existingMessages = await prisma.message.findMany({
        where: { channelId: targetChannelId }
    });
    console.log(`Current message count in channel: ${existingMessages.length}`);

    if (existingMessages.length < 5) {
        console.log('Message count is less than 5. Inserting sample messages directly using Prisma...');
        const sampleTexts = [
            "Kal ka assignment kya hai?",
            "DSA ka homework submit karna hai kal tak.",
            "Exam schedule aa gaya hai official website pe.",
            "Web Dev mini project ke groups ban chuke hain.",
            "Kal subah 10 baje extra class hai, sab log time pe aana."
        ];

        for (const content of sampleTexts) {
            const msg = await prisma.message.create({
                data: {
                    channelId: targetChannelId,
                    senderId: user.id,
                    content
                }
            });
            console.log(`Inserted message ID ${msg.id}: "${msg.content}"`);
        }
    } else {
        console.log('Channel already has 5 or more messages. Skipping insertion.');
    }

    console.log(`\n--- STEP 3 & 4: CALL GET /api/ai/summary/${targetChannelId} ---`);
    const summaryRes = await fetch(`http://localhost:5000/api/ai/summary/${targetChannelId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const summaryStatus = summaryRes.status;
    const summaryText = await summaryRes.text();
    console.log(`HTTP Status Code: ${summaryStatus}`);
    console.log(`Response Body: ${summaryText}`);

    await prisma.$disconnect();
}

main().catch(err => {
    console.error('Script Error:', err);
    prisma.$disconnect();
});
