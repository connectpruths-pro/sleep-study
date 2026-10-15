const emailService = require('./emailService');

async function testResetEmail() {
    console.log('Sending test reset email...');
    try {
        const result = await emailService.sendPasswordResetEmail({
            toEmail: 'adithishivkumar19@gmail.com',
            userName: 'Dr. Ram',
            resetUrl: 'https://sleep-aurora.web.app/reset-password.html?token=test123456789'
        });
        console.log('Result:', result);
    } catch (e) {
        console.error('Error:', e);
    }
}

testResetEmail();
