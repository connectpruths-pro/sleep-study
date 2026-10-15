const pool = require('./db');

async function checkAdminCredentials() {
    try {
        console.log('Querying admin users in PostgreSQL database...');
        const res = await pool.query(`SELECT id, username, email, full_name, role FROM doctors`);
        console.log(`Total Accounts in DB: ${res.rows.length}`);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error('Error checking admin credentials:', err);
        process.exit(1);
    }
}

checkAdminCredentials();
