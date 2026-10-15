require('dotenv').config();
const pool = require('./db');

(async () => {
    try {
        // Check if users table exists and has the role column
        const tableCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'users' ORDER BY ordinal_position;
        `);
        console.log('Users table columns:', tableCheck.rows.map(r => r.column_name));

        const result = await pool.query('SELECT id, username, password_hash, role, full_name, is_active FROM users LIMIT 10');
        console.log('Users:', result.rows);
    } catch (err) {
        console.error('Error:', err.message);
        
        // If role column doesn't exist, try without it
        try {
            const result = await pool.query('SELECT * FROM users LIMIT 10');
            console.log('Users (all columns):', result.rows);
        } catch (err2) {
            console.error('Second attempt error:', err2.message);
        }
    } finally {
        await pool.end();
    }
})();
