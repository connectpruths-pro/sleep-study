const { Pool } = require('pg');

const cloudPool = new Pool({
    connectionString: 'postgresql://sleep_db_04sw_user:2t0S0fHYKjJw0fmCDM3SMWQlUQgtcNPD@dpg-d9src8ijnfac73a1cso0-a.oregon-postgres.render.com/sleep_db_04sw',
    ssl: { rejectUnauthorized: false }
});

async function cleanup() {
    try {
        console.log('🗑️ Deleting all Dr. Adithya / adithishivkumar19 records from cloud database...');
        const res = await cloudPool.query(`
            DELETE FROM users 
            WHERE full_name ILIKE '%Adith%' OR email ILIKE '%adithishivkumar19%'
            RETURNING id, full_name, email;
        `);
        console.log(`✅ Successfully deleted ${res.rows.length} duplicate doctor record(s):`, res.rows);
    } catch (e) {
        console.error('❌ Error deleting:', e);
    } finally {
        await cloudPool.end();
    }
}

cleanup();
