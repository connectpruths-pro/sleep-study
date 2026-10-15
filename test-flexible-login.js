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

async function testLoginInputs() {
    const inputs = ['clinician', 'Platform Admin', 'CHRISTINA', 'christinajothi@sleepmedsolutions.in', 'adithishivkumar19@gmail.com', 'ADITHI'];
    console.log('Testing flexible login lookup logic:');

    for (const input of inputs) {
        const res = await pool.query(
            'SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER($1) OR LOWER(TRIM(email)) = LOWER($1) OR LOWER(TRIM(full_name)) = LOWER($1)',
            [input.trim()]
        );
        if (res.rows.length > 0) {
            console.log(`✅ Input "${input}" matched user ID #${res.rows[0].id} (username: "${res.rows[0].username}", email: "${res.rows[0].email}", full_name: "${res.rows[0].full_name}")`);
        } else {
            console.log(`❌ Input "${input}" did NOT match any user.`);
        }
    }
    process.exit(0);
}

testLoginInputs();
