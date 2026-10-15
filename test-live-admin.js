const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://sleep_db_04sw_user:2t0S0fHYKjJw0fmCDM3SMWQlUQgtcNPD@dpg-d9src8ijnfac73a1cso0-a.oregon-postgres.render.com/sleep_db_04sw',
    ssl: { rejectUnauthorized: false }
});

async function checkLiveAdmin() {
    try {
        console.log('Querying live Render database accounts...');
        const res = await pool.query('SELECT id, username, email, role, full_name FROM doctors');
        console.log(`Found ${res.rows.length} accounts:`);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error('Error connecting to live Render DB:', err);
        process.exit(1);
    }
}

checkLiveAdmin();
