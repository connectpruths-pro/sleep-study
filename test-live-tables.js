const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://sleep_db_04sw_user:2t0S0fHYKjJw0fmCDM3SMWQlUQgtcNPD@dpg-d9src8ijnfac73a1cso0-a.oregon-postgres.render.com/sleep_db_04sw',
    ssl: { rejectUnauthorized: false }
});

async function listTables() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        `);
        console.log('Tables in Render Cloud database:');
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error('Error listing tables:', err);
        process.exit(1);
    }
}

listTables();
