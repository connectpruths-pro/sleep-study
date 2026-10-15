const pool = require('./db');

async function migrateResetColumns() {
    try {
        console.log('Adding reset_token and reset_expires_at columns to cloud database...');
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS reset_token VARCHAR(100) UNIQUE,
            ADD COLUMN IF NOT EXISTS reset_expires_at TIMESTAMP;
        `);
        console.log('✅ Columns added successfully to users table!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration error:', err.message);
        process.exit(1);
    }
}

migrateResetColumns();
