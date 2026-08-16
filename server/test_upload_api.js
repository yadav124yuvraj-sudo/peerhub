const fs = require('fs');
const path = require('path');

async function testApi() {
  try {
    // 1. Login
    console.log('Sending login request to http://localhost:5000/api/auth/login...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test1@example.com', password: 'password123' })
    });
    
    const loginData = await loginRes.json();
    console.log('Login response status:', loginRes.status);
    console.log('Login response body:', loginData);

    if (!loginRes.ok || !loginData.token) {
      console.error('Login failed!');
      return;
    }

    const token = loginData.token;

    // 2. Server ID obtained from prisma query
    const serverId = '0a3ea54e-233b-4200-8ade-d9168cd57b05';

    // 3. Prepare multipart form data
    const filePath = path.join(__dirname, 'test.txt');
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', blob, 'test.txt');
    formData.append('serverId', serverId);
    formData.append('title', 'Test Resource');
    formData.append('tags', 'test,demo');

    console.log('Sending upload request to http://localhost:5000/api/resources/upload...');
    const uploadRes = await fetch('http://localhost:5000/api/resources/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const uploadData = await uploadRes.json();
    console.log('Upload response status:', uploadRes.status);
    console.log('Upload response body:', uploadData);
  } catch (error) {
    console.error('Test execution error:', error);
  }
}

testApi();
