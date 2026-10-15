const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'aurorasleep580@gmail.com',
        pass: 'jqwzodjepnjibgfd'
    },
    tls: {
        rejectUnauthorized: false
    },
    family: 4 // Force IPv4
});

async function run() {
    console.log('Testing IPv4 Gmail connection...');
    try {
        await transporter.verify();
        console.log('✅ IPv4 connection verified!');
        const info = await transporter.sendMail({
            from: 'Aurora Sleep Screening <aurorasleep580@gmail.com>',
            to: 'adithishivkumar19@gmail.com',
            subject: '🌙 Direct IPv4 Test Email — Aurora Sleep',
            text: 'This email is sent using forced IPv4 connection!'
        });
        console.log('✅ Sent successfully! Message ID:', info.messageId);
    } catch (e) {
        console.error('❌ Error:', e);
    }
}
run();
