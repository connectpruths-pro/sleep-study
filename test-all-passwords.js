const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
    connectionString: 'postgresql://sleep_db_04sw_user:2t0S0fHYKjJw0fmCDM3SMWQlUQgtcNPD@dpg-d9src8ijnfac73a1cso0-a.oregon-postgres.render.com/sleep_db_04sw',
    ssl: { rejectUnauthorized: false }
});

function verifyPassword(password, storedValue) {
    if (!storedValue || !storedValue.includes(':')) return false;
    const [salt, originalHash] = storedValue.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
}

async function testAllPasswords() {
    const res = await pool.query('SELECT id, username, email, full_name, role, password_hash FROM users ORDER BY id ASC;');
    const passwordsToTest = ['AuroraSleep2026!', 'AuroraSleep2025!', 'admin', 'admin123', 'clinician', 'clinician123', 'password', '123456', 'sleepmed', 'sleepmed123'];

    console.log('Testing passwords for all 10 database accounts:');
    for (const u of res.rows) {
        console.log(`\nAccount ID #${u.id} | Username: "${u.username}" | Email: "${u.email}" | Name: "${u.full_name}" | Role: "${u.role}"`);
        let found = false;
        for (const p of passwordsToTest) {
            if (verifyPassword(p, u.password_hash)) {
                console.log(`   ✅ PASSWORD MATCH: "${p}"`);
                found = true;
                break;
            }
        }
        if (!found) {
            console.log(`   ⚠️ Password is a custom password set by user.`);
        }
    }
    process.exit(0);
}

testAllPasswords();
