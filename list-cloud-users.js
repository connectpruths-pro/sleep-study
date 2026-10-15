const pool = require('./db');

async function listUsers() {
    try {
        const res = await pool.query(`
            SELECT id, username, full_name, email, role, status, is_active FROM users ORDER BY id;
        `);
        console.log('--- ALL USERS IN DATABASE ---');
        console.table(res.rows);
        process.exit(0);
    } catch (e) {
        console.error('Error fetching users:', e.message);
        process.exit(1);
    }
}

listUsers();
