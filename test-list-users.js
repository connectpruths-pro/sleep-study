const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://sleep_db_04sw_user:2t0S0fHYKjJw0fmCDM3SMWQlUQgtcNPD@dpg-d9src8ijnfac73a1cso0-a.oregon-postgres.render.com/sleep_db_04sw',
    ssl: { rejectUnauthorized: false }
});

async function listUsers() {
    try {
        const res = await pool.query(`SELECT id, username, email, full_name, role FROM users;`);
        console.log('User Accounts in Render Cloud database:');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error('Error listing users:', err);
        process.exit(1);
    }
}

listUsers();
