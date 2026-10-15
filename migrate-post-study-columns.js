const pool = require('./db');
const { Pool } = require('pg');

const CLOUD_DATABASE_URL = 'postgresql://sleep_db_04sw_user:2t0S0fHYKjJw0fmCDM3SMWQlUQgtcNPD@dpg-d9src8ijnfac73a1cso0-a.oregon-postgres.render.com/sleep_db_04sw';

async function migratePostStudyColumns() {
    try {
        console.log('1. Adding post-study columns (ahi, secondary_findings, admin_comments) to LOCAL database...');
        await pool.query(`
            ALTER TABLE screening_results 
            ADD COLUMN IF NOT EXISTS ahi VARCHAR(50),
            ADD COLUMN IF NOT EXISTS secondary_findings VARCHAR(255),
            ADD COLUMN IF NOT EXISTS admin_comments TEXT;
        `);
        console.log('✅ Local database migration successful!');
    } catch (e) {
        console.error('⚠️ Local migration notice:', e.message);
    }

    try {
        console.log('2. Adding post-study columns to RENDER CLOUD database...');
        const cloudPool = new Pool({
            connectionString: CLOUD_DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        await cloudPool.query(`
            ALTER TABLE screening_results 
            ADD COLUMN IF NOT EXISTS ahi VARCHAR(50),
            ADD COLUMN IF NOT EXISTS secondary_findings VARCHAR(255),
            ADD COLUMN IF NOT EXISTS admin_comments TEXT;
        `);
        console.log('✅ Render Cloud database migration successful!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Cloud migration error:', e.message);
        process.exit(1);
    }
}

migratePostStudyColumns();
