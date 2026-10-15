const { Pool } = require('pg');
const pool = require('./db');

async function testDeleteLogic() {
    try {
        console.log('Testing delete patient query on database...');
        // 1. Create a dummy patient
        const pRes = await pool.query(`INSERT INTO patients (full_name, status) VALUES ('Dummy Delete Test', 'draft') RETURNING id;`);
        const pId = pRes.rows[0].id;
        console.log('Created dummy patient ID:', pId);

        // 2. Insert dummy screening answers
        await pool.query(`INSERT INTO screening_answers (patient_id, age) VALUES ($1, 25);`, [pId]);

        // 3. Insert dummy screening results
        await pool.query(`INSERT INTO screening_results (patient_id, osa_score) VALUES ($1, 0);`, [pId]);

        // 4. Test delete cascade logic
        await pool.query('DELETE FROM screening_answers WHERE patient_id = $1', [pId]);
        await pool.query('DELETE FROM screening_results WHERE patient_id = $1', [pId]);
        const delRes = await pool.query('DELETE FROM patients WHERE id = $1 RETURNING *', [pId]);

        console.log('✅ Delete query executed cleanly! Deleted row count:', delRes.rows.length);
        process.exit(0);

    } catch (e) {
        console.error('❌ Delete test failed:', e.message);
        process.exit(1);
    }
}

testDeleteLogic();
