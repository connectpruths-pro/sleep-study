const nodemailer = require('nodemailer');

async function testGmail() {
    console.log('Testing Gmail SMTP connection...');

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'aurorasleep580@gmail.com',
            pass: 'jqwzodjepnjibgfd'
        }
    });

    try {
        console.log('Verifying transporter...');
        await transporter.verify();
        console.log('✅ Transporter verified successfully!');

        console.log('Sending test email to adithishivkumar19@gmail.com...');
        const info = await transporter.sendMail({
            from: 'Aurora Sleep Screening <aurorasleep580@gmail.com>',
            to: 'adithishivkumar19@gmail.com',
            subject: '🌙 Test Email — Aurora Sleep Platform',
            text: 'Hello Dr. Adithya, this is a test email from the Aurora Sleep Screening platform!'
        });
        console.log('✅ Email sent successfully! Message ID:', info.messageId);
    } catch (err) {
        console.error('❌ Gmail SMTP Error:', err);
    }
}

testGmail();
