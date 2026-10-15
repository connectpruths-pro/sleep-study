const crypto = require('crypto');
const targetHash = '6c8e845ff1025fb15a8d63d3f94a737f1917f694e9f9024f923e590059c1ff04'; // or similar

const testPasses = ['admin', 'clinician', 'clinician123', 'admin123', 'password', 'AuroraSleep2026!', 'AuroraSleep2025!', 'AuroraSleep', 'Aurora Sleep'];

testPasses.forEach(p => {
    const sha256 = crypto.createHash('sha256').update(p).digest('hex');
    const md5 = crypto.createHash('md5').update(p).digest('hex');
    console.log(`Pass: "${p}"`);
    console.log(`   SHA256: ${sha256}`);
    console.log(`   MD5:    ${md5}`);
});
