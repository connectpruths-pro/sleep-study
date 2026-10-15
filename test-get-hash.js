const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://sleep_db_04sw_user:2t0S0fHYKjJw0fmCDM3SMWQlUQgtcNPD@dpg-d9src8ijnfac73a1cso0-a.oregon-postgres.render.com/sleep_db_04sw',
    ssl: { rejectUnauthorized: false }
});

async function getFullHash() {
    try {
        const res = await pool.query(`SELECT id, username, password_hash, role FROM users WHERE id = 1;`);
        console.log('Full record for User #1:', res.rows[0]);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

getFullHash();
