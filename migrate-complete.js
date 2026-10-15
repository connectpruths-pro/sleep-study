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

async function run() {
    try {
        console.log('🔄 Rebuilding exact database schema on Cloud PostgreSQL...');

        // 1. Drop and recreate all 4 tables with exact schema
        await cloudPool.query(`
            DROP TABLE IF EXISTS screening_results CASCADE;
            DROP TABLE IF EXISTS screening_answers CASCADE;
            DROP TABLE IF EXISTS patients CASCADE;
            DROP TABLE IF EXISTS users CASCADE;

            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE,
                password_hash VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                role VARCHAR(20) NOT NULL DEFAULT 'doctor',
                full_name VARCHAR(150),
                email VARCHAR(150),
                phone VARCHAR(30),
                specialization VARCHAR(100),
                is_active BOOLEAN DEFAULT TRUE,
                doctor_code VARCHAR(50) UNIQUE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                invite_token VARCHAR(100) UNIQUE,
                invite_expires_at TIMESTAMP,
                status VARCHAR(20) DEFAULT 'active'
            );

            CREATE TABLE patients (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(150),
                phone VARCHAR(30),
                email VARCHAR(150),
                consent_given BOOLEAN DEFAULT FALSE,
                status VARCHAR(20) DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                doctor_id INT REFERENCES users(id) ON DELETE SET NULL,
                referral_source TEXT
            );

            CREATE TABLE screening_answers (
                id SERIAL PRIMARY KEY,
                patient_id INT UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
                age INT,
                gender VARCHAR(20),
                menstrual VARCHAR(30),
                height NUMERIC(5,2),
                weight NUMERIC(5,2),
                neck_raw NUMERIC(5,2),
                medical JSONB,
                consumption JSONB,
                work VARCHAR(30),
                schedule VARCHAR(20),
                sleep_start TIME,
                wake_time TIME,
                avg_sleep NUMERIC(4,2),
                sleep_satisfaction VARCHAR(30),
                daytime_satisfaction VARCHAR(30),
                daytime_sleepy VARCHAR(10),
                sleepy_freq VARCHAR(30),
                insomnia_gate VARCHAR(10),
                sleep_latency VARCHAR(30),
                night_waking VARCHAR(10),
                difficulty_back_sleep VARCHAR(10),
                hypersomnia_gate VARCHAR(10),
                difficulty_waking VARCHAR(10),
                nap_freq VARCHAR(30),
                nap_duration VARCHAR(30),
                nap_refreshed VARCHAR(10),
                snoring_gate VARCHAR(10),
                witnessed_apnea VARCHAR(10),
                loud_snoring VARCHAR(10),
                night_awakenings VARCHAR(10),
                morning_headache VARCHAR(10),
                dry_mouth VARCHAR(10),
                circadian_gate VARCHAR(10),
                chronotype VARCHAR(30),
                brain_fog VARCHAR(10),
                weekend_shift VARCHAR(10),
                duration VARCHAR(20),
                completion_percent INT DEFAULT 0,
                last_completed_step INT DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE screening_results (
                id SERIAL PRIMARY KEY,
                patient_id INT UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
                sleep_opportunity NUMERIC(4,2),
                osa_score INT,
                osa_tier VARCHAR(20),
                insomnia_score INT,
                insomnia_tier VARCHAR(20),
                hypersomnia_score INT,
                hypersomnia_tier VARCHAR(20),
                circadian_score INT,
                circadian_tier VARCHAR(20),
                circadian_subtypes JSONB,
                primary_finding_code VARCHAR(30),
                primary_finding_label VARCHAR(100),
                comorbidities JSONB,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Cloud tables created with 100% precision!');

        // 2. Migrate users
        console.log('👥 Copying Users & Doctors...');
        const users = await localPool.query('SELECT * FROM users ORDER BY id');
        for (const u of users.rows) {
            await cloudPool.query(`
                INSERT INTO users (id, username, password_hash, created_at, role, full_name, email, phone, specialization, is_active, doctor_code, updated_at, invite_token, invite_expires_at, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
                u.id, u.username, u.password_hash, u.created_at, u.role, u.full_name,
                u.email, u.phone, u.specialization, u.is_active, u.doctor_code,
                u.updated_at, u.invite_token, u.invite_expires_at, u.status
            ]);
        }
        await cloudPool.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
        console.log(`✅ ${users.rows.length} Users & Doctors copied!`);

        // 3. Migrate patients
        console.log('📋 Copying Patients...');
        const patients = await localPool.query('SELECT * FROM patients ORDER BY id');
        for (const p of patients.rows) {
            await cloudPool.query(`
                INSERT INTO patients (id, full_name, phone, email, consent_given, status, created_at, updated_at, doctor_id, referral_source)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                p.id, p.full_name, p.phone, p.email, p.consent_given, p.status,
                p.created_at, p.updated_at, p.doctor_id, p.referral_source
            ]);
        }
        await cloudPool.query("SELECT setval('patients_id_seq', (SELECT MAX(id) FROM patients))");
        console.log(`✅ ${patients.rows.length} Patients copied!`);

        // 4. Migrate screening_answers
        console.log('📝 Copying Screening Answers...');
        const answers = await localPool.query('SELECT * FROM screening_answers ORDER BY id');
        for (const a of answers.rows) {
            await cloudPool.query(`
                INSERT INTO screening_answers (
                    id, patient_id, age, gender, menstrual, height, weight, neck_raw,
                    medical, consumption, work, schedule, sleep_start, wake_time, avg_sleep,
                    sleep_satisfaction, daytime_satisfaction, daytime_sleepy, sleepy_freq,
                    insomnia_gate, sleep_latency, night_waking, difficulty_back_sleep,
                    hypersomnia_gate, difficulty_waking, nap_freq, nap_duration, nap_refreshed,
                    snoring_gate, witnessed_apnea, loud_snoring, night_awakenings, morning_headache, dry_mouth,
                    circadian_gate, chronotype, brain_fog, weekend_shift, duration,
                    completion_percent, last_completed_step, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                    $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
                    $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42
                )
            `, [
                a.id, a.patient_id, a.age, a.gender, a.menstrual, a.height, a.weight, a.neck_raw,
                a.medical ? JSON.stringify(a.medical) : null,
                a.consumption ? JSON.stringify(a.consumption) : null,
                a.work, a.schedule, a.sleep_start, a.wake_time, a.avg_sleep,
                a.sleep_satisfaction, a.daytime_satisfaction, a.daytime_sleepy, a.sleepy_freq,
                a.insomnia_gate, a.sleep_latency, a.night_waking, a.difficulty_back_sleep,
                a.hypersomnia_gate, a.difficulty_waking, a.nap_freq, a.nap_duration, a.nap_refreshed,
                a.snoring_gate, a.witnessed_apnea, a.loud_snoring, a.night_awakenings, a.morning_headache, a.dry_mouth,
                a.circadian_gate, a.chronotype, a.brain_fog, a.weekend_shift, a.duration,
                a.completion_percent, a.last_completed_step, a.updated_at
            ]);
        }
        if (answers.rows.length > 0) {
            await cloudPool.query("SELECT setval('screening_answers_id_seq', (SELECT MAX(id) FROM screening_answers))");
        }
        console.log(`✅ ${answers.rows.length} Screening Answers copied!`);

        // 5. Migrate screening_results
        console.log('📊 Copying Screening Results & Risk Scores...');
        const results = await localPool.query('SELECT * FROM screening_results ORDER BY id');
        for (const r of results.rows) {
            await cloudPool.query(`
                INSERT INTO screening_results (
                    id, patient_id, sleep_opportunity, osa_score, osa_tier,
                    insomnia_score, insomnia_tier, hypersomnia_score, hypersomnia_tier,
                    circadian_score, circadian_tier, circadian_subtypes,
                    primary_finding_code, primary_finding_label, comorbidities, submitted_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            `, [
                r.id, r.patient_id, r.sleep_opportunity, r.osa_score, r.osa_tier,
                r.insomnia_score, r.insomnia_tier, r.hypersomnia_score, r.hypersomnia_tier,
                r.circadian_score, r.circadian_tier,
                r.circadian_subtypes ? JSON.stringify(r.circadian_subtypes) : null,
                r.primary_finding_code, r.primary_finding_label,
                r.comorbidities ? JSON.stringify(r.comorbidities) : null,
                r.submitted_at
            ]);
        }
        if (results.rows.length > 0) {
            await cloudPool.query("SELECT setval('screening_results_id_seq', (SELECT MAX(id) FROM screening_results))");
        }
        console.log(`✅ ${results.rows.length} Screening Results copied!`);

        console.log('\n🎉 100% COMPLETE: ALL TABLES AND RECORDS ARE RESTORED!');
    } catch (e) {
        console.error('❌ Migration Error:', e);
    } finally {
        await localPool.end();
        await cloudPool.end();
    }
}

run();
