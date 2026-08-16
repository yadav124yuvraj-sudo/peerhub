const { Client } = require('pg');
require('dotenv').config();

async function test() {
    const url = process.env.DATABASE_URL.replace('ep-still-water-azwj4ygs.', 'ep-still-water-azwj4ygs-pooler.').split('?')[0];
    console.log('Connecting to pooler URL:', url);
    const client = new Client({ 
        connectionString: url,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT id, username, email FROM "User"');
        console.log('Users in DB:', res.rows);
        
        const channels = await client.query('SELECT id, name FROM "Channel"');
        console.log('Channels in DB:', channels.rows);
        
        await client.end();
    } catch (err) {
        console.error('PG Test Error:', err);
    }
}

test();
