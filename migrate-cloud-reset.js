const { Pool } = require('pg');

const CLOUD_DATABASE_URL = 'postgresql://sleep_db_04sw_user:2t0S0fHYKjJw0fmCDM3SMWQlUQgtcNPD@dpg-d9src8ijnfac73a1cso0-a.oregon-postgres.render.com/sleep_db_04sw';

const pool = new Pool({
    connectionString: CLOUD_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runCloudMigration() {
    try {
        console.log('Connecting to Render PostgreSQL Cloud Database...');
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS reset_token VARCHAR(100),
            ADD COLUMN IF NOT EXISTS reset_expires_at TIMESTAMP;
        `);
        console.log('✅ reset_token & reset_expires_at successfully added to Render Cloud DB!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Migration error on cloud DB:', e.message);
        process.exit(1);
    }
}

runCloudMigration();
