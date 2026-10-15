require('dotenv').config();
const pool = require('./db');

(async () => {
    try {
        console.log('Running user invitation schema migration...');
        await pool.query(`
            ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
            ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_token VARCHAR(100) UNIQUE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMP;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
        `);
        console.log('✅ Schema migration successful: invite_token, invite_expires_at, status added; NULL allowed for username/password_hash');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        await pool.end();
    }
})();
