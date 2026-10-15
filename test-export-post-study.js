const pool = require('./db');

async function testExportPostStudy() {
    try {
        console.log('Testing query with post-study columns (ahi, secondary_findings, admin_comments)...');
        const res = await pool.query(`
            SELECT p.id, p.full_name, sr.ahi, sr.secondary_findings, sr.admin_comments
            FROM patients p
            LEFT JOIN screening_results sr ON p.id = sr.patient_id
            LIMIT 5;
        `);
        console.log('✅ Query succeeded! Returned rows:');
        console.table(res.rows);
        process.exit(0);
    } catch (e) {
        console.error('❌ Test failed:', e.message);
        process.exit(1);
    }
}

testExportPostStudy();
