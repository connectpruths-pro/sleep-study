const crypto = require('crypto');

const salt = '6c8e845ff1025fb15a8d63d3ff6c2ede';
const target = '9ada7dea4028f80a504ee67891bca25a8d4ba7045a8a2fa94fcf1002ab045e8f7f20cf949c8d2d981eef8f528f77b9bc9bde5103311ef4521eb28ca614da0ecc';

const passwords = ['AuroraSleep2026!', 'AuroraSleep2025!', 'clinician', 'admin', 'password', 'AuroraSleep', 'Aurora Sleep', 'sleepmed123', 'admin123', '123456'];

passwords.forEach(p => {
    const derived = crypto.pbkdf2Sync(p, salt, 1000, 64, 'sha512').toString('hex');
    if (derived === target) {
        console.log(`✅ MATCH! Password is: "${p}"`);
    } else {
        const derived100k = crypto.pbkdf2Sync(p, salt, 100000, 64, 'sha512').toString('hex');
        if (derived100k === target) {
            console.log(`✅ MATCH 100k! Password is: "${p}"`);
        }
    }
});
