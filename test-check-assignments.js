const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://sleep_db_04sw_user:2t0S0fHYKjJw0fmCDM3SMWQlUQgtcNPD@dpg-d9src8ijnfac73a1cso0-a.oregon-postgres.render.com/sleep_db_04sw',
    ssl: { rejectUnauthorized: false }
});

async function checkPatientsAndDoctors() {
    try {
        console.log('Fetching patients from Render database...');
        const patientsRes = await pool.query(`
            SELECT p.id, p.full_name, p.doctor_id, p.status, d.username as doctor_username, d.full_name as doctor_name
            FROM patients p
            LEFT JOIN users d ON p.doctor_id = d.id;
        `);
        
        console.log(`Total Patients in Database: ${patientsRes.rows.length}`);
        console.table(patientsRes.rows);

        const doctorsRes = await pool.query(`SELECT id, username, email, full_name, role FROM users;`);
        console.log('All Doctor Accounts:');
        console.table(doctorsRes.rows);

        process.exit(0);
    } catch (err) {
        console.error('Error checking database:', err);
        process.exit(1);
    }
}

checkPatientsAndDoctors();
