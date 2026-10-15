const { Pool } = require('pg');

const localPool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'sleepmed_dev',
    password: 'AuroraSleep2026!',
    port: 5432,
});

const cloudPool = new Pool({
    connectionString: 'postgresql://sleep_db_04sw_user:2t0S0fHYKjJw0fmCDM3SMWQlUQgtcNPD@dpg-d9src8ijnfac73a1cso0-a.oregon-postgres.render.com/sleep_db_04sw',
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('🔄 Starting data sync from Local Database to Cloud Database...');

    try {
        // 1. Create tables if they do not exist in cloud
        console.log('📦 Setting up Cloud Database schema...');
        await cloudPool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE,
                password_hash VARCHAR(255),
                role VARCHAR(20) NOT NULL DEFAULT 'doctor',
                full_name VARCHAR(150),
                email VARCHAR(150),
                phone VARCHAR(30),
                specialization VARCHAR(100),
                is_active BOOLEAN DEFAULT TRUE,
                status VARCHAR(20) DEFAULT 'active',
                doctor_code VARCHAR(50) UNIQUE,
                invite_token VARCHAR(100) UNIQUE,
                invite_expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                age INTEGER,
                gender VARCHAR(20),
                phone VARCHAR(30),
                email VARCHAR(150),
                screening_data JSONB,
                scores JSONB,
                risk_level VARCHAR(50),
                assigned_doctor_id INTEGER REFERENCES users(id),
                status VARCHAR(50) DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Fetch and migrate users/doctors
        console.log('👥 Migrating Users & Doctors...');
        const localUsers = await localPool.query('SELECT * FROM users');
        let migratedUsersCount = 0;

        for (const user of localUsers.rows) {
            await cloudPool.query(`
                INSERT INTO users (id, username, password_hash, role, full_name, email, phone, specialization, is_active, status, doctor_code, invite_token, invite_expires_at, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                ON CONFLICT (id) DO UPDATE SET
                    username = EXCLUDED.username,
                    password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role,
                    full_name = EXCLUDED.full_name,
                    email = EXCLUDED.email,
                    phone = EXCLUDED.phone,
                    specialization = EXCLUDED.specialization,
                    is_active = EXCLUDED.is_active,
                    status = EXCLUDED.status,
                    doctor_code = EXCLUDED.doctor_code;
            `, [
                user.id, user.username, user.password_hash, user.role, user.full_name,
                user.email, user.phone, user.specialization, user.is_active, user.status,
                user.doctor_code, user.invite_token, user.invite_expires_at,
                user.created_at, user.updated_at
            ]);
            migratedUsersCount++;
        }
        // Update user sequence
        await cloudPool.query("SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users))");
        console.log(`✅ Migrated ${migratedUsersCount} user(s) and doctor(s)!`);

        // 3. Fetch and migrate patients
        console.log('📋 Migrating Patient Records & Screenings...');
        const localPatients = await localPool.query('SELECT * FROM patients');
        let migratedPatientsCount = 0;

        for (const p of localPatients.rows) {
            await cloudPool.query(`
                INSERT INTO patients (id, first_name, last_name, age, gender, phone, email, screening_data, scores, risk_level, assigned_doctor_id, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (id) DO UPDATE SET
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    age = EXCLUDED.age,
                    gender = EXCLUDED.gender,
                    phone = EXCLUDED.phone,
                    email = EXCLUDED.email,
                    screening_data = EXCLUDED.screening_data,
                    scores = EXCLUDED.scores,
                    risk_level = EXCLUDED.risk_level,
                    assigned_doctor_id = EXCLUDED.assigned_doctor_id,
                    status = EXCLUDED.status;
            `, [
                p.id, p.first_name, p.last_name, p.age, p.gender, p.phone, p.email,
                p.screening_data ? JSON.stringify(p.screening_data) : null,
                p.scores ? JSON.stringify(p.scores) : null,
                p.risk_level, p.assigned_doctor_id, p.status,
                p.created_at, p.updated_at
            ]);
            migratedPatientsCount++;
        }
        // Update patient sequence
        await cloudPool.query("SELECT setval('patients_id_seq', (SELECT COALESCE(MAX(id), 1) FROM patients))");
        console.log(`✅ Migrated ${migratedPatientsCount} patient record(s)!`);

        console.log('\n🎉 ALL DATA HAS BEEN SUCCESSFULLY MIGRATED TO CLOUD DATABASE!');
    } catch (err) {
        console.error('❌ Migration error:', err);
    } finally {
        await localPool.end();
        await cloudPool.end();
    }
}

migrate();
