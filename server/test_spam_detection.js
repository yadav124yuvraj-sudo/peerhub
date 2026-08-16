const { io } = require('socket.io-client');

const CHANNEL_ID = '4a74990c-66b2-4595-9c77-4c0f5406fef2';
const SENDER_ID = '0f24ff27-d78e-4e8c-b95b-16198c2121fb';

const socket = io('http://localhost:5000');

const messagesToSend = [
    { type: 'normal', content: 'Hello everyone' },
    { type: 'suspicious', content: 'Check this out bit.ly/free-money you won!!!' }
];

let receivedCount = 0;
const results = [];

socket.on('connect', () => {
    console.log('Connected to server with socket id:', socket.id);

    // Join test channel
    socket.emit('join_channel', CHANNEL_ID);
    console.log(`Joined channel: ${CHANNEL_ID}`);

    // Send messages sequentially
    sendNextMessage(0);
});

socket.on('receive_message', (message) => {
    console.log(`\n[MESSAGE RECEIVED]`);
    console.log(`Content: "${message.content}"`);
    console.log(`isSuspicious: ${message.isSuspicious}`);

    results.push({
        content: message.content,
        isSuspicious: message.isSuspicious
    });

    receivedCount++;

    if (receivedCount < messagesToSend.length) {
        sendNextMessage(receivedCount);
    } else {
        verifyResults();
    }
});

function sendNextMessage(index) {
    const item = messagesToSend[index];
    console.log(`\nSending ${item.type} message: "${item.content}"...`);
    socket.emit('send_message', {
        channelId: CHANNEL_ID,
        senderId: SENDER_ID,
        content: item.content
    });
}

function verifyResults() {
    console.log('\n--- VERIFICATION SUMMARY ---');
    
    const normalResult = results.find(r => r.content === messagesToSend[0].content);
    const suspiciousResult = results.find(r => r.content === messagesToSend[1].content);

    let allPassed = true;

    if (normalResult && normalResult.isSuspicious === false) {
        console.log('✅ Normal Message Test PASSED (isSuspicious === false)');
    } else {
        console.log('❌ Normal Message Test FAILED');
        allPassed = false;
    }

    if (suspiciousResult && suspiciousResult.isSuspicious === true) {
        console.log('✅ Suspicious Message Test PASSED (isSuspicious === true)');
    } else {
        console.log('❌ Suspicious Message Test FAILED');
        allPassed = false;
    }

    if (allPassed) {
        console.log('\n🎉 ALL SPAM DETECTION TESTS PASSED SUCCESSFULLY!');
    } else {
        console.log('\n⚠️ SOME TESTS FAILED!');
    }

    socket.disconnect();
    process.exit(allPassed ? 0 : 1);
}

socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err);
    process.exit(1);
});
