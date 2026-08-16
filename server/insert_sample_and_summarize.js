const prisma = require('./prismaClient');

const CHANNEL_ID = '4a74990c-66b2-4595-9c77-4c0f5406fef2';
const TEST_EMAIL = 'test1@example.com';
const TEST_PASSWORD = 'password123';

async function main() {
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });

    console.log('Inserting 5 sample messages into test channel...');
    const sampleTexts = [
        "Kal ka Web Dev assignment kya hai?",
        "DSA ka homework kal shaam 5 baje tak submit karna hai.",
        "Exam schedule aa gaya hai official portal pe, Next week se exams start hain.",
        "Kal subah 10 baje extra revision class scheduled hai.",
        "Mini project ke submission groups final ho gaye hain."
    ];

    for (const content of sampleTexts) {
        await prisma.message.create({
            data: {
                channelId: CHANNEL_ID,
                senderId: user.id,
                content
            }
        });
    }
    console.log('Sample messages inserted successfully.');

    // Login to get token
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    // Fetch AI Summary
    const summaryRes = await fetch(`http://localhost:5000/api/ai/summary/${CHANNEL_ID}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await summaryRes.json();
    console.log('\n--- GEMINI AI SUMMARY RESULT ---');
    console.log(result.summary);

    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    prisma.$disconnect();
});
