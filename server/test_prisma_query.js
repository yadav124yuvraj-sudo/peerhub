const prisma = require('./prismaClient');

async function main() {
    try {
        const users = await prisma.user.findMany();
        console.log('PRISMA QUERY SUCCESS! Users count:', users.length);
        console.log('Users:', users);
    } catch (err) {
        console.error('PRISMA QUERY ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
