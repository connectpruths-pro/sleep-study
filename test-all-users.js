const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://sleep_db_04sw_user:2t0S0fHYKjJw0fmCDM3SMWQlUQgtcNPD@dpg-d9src8ijnfac73a1cso0-a.oregon-postgres.render.com/sleep_db_04sw',
    ssl: { rejectUnauthorized: false }
});

async function listAllDatabaseUsers() {
    try {
        const res = await pool.query('SELECT id, username, email, full_name, role, created_at FROM users ORDER BY id ASC;');
        console.log(`Total accounts in original database: ${res.rows.length}`);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listAllDatabaseUsers();
