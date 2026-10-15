const { Pool } = require('pg');

const localPool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'sleepmed_dev',
    password: 'AuroraSleep2026!',
    port: 5432,
});

async function inspect() {
    try {
        const tables = await localPool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables in local db:', tables.rows.map(r => r.table_name));

        for (const t of tables.rows) {
            const cols = await localPool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [t.table_name]);
            console.log(`\nColumns in ${t.table_name}:`, cols.rows.map(c => `${c.column_name} (${c.data_type})`));
            
            const count = await localPool.query(`SELECT COUNT(*) FROM "${t.table_name}"`);
            console.log(`Count in ${t.table_name}: ${count.rows[0].count}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await localPool.end();
    }
}
inspect();
