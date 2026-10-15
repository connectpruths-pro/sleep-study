const pool = require('./db');

async function testExportQuery() {
    try {
        const query = `
            SELECT 
                p.id AS patient_id,
                p.full_name,
                p.phone,
                p.email,
                p.status,
                p.created_at,
                p.referral_source,
                u.full_name AS doctor_name,
                sa.age,
                sa.gender,
                sa.menstrual,
                sa.height,
                sa.weight,
                sa.neck_raw,
                sa.medical,
                sa.consumption,
                sa.work,
                sa.schedule,
                sa.sleep_start,
                sa.wake_time,
                sa.avg_sleep,
                sa.sleep_satisfaction,
                sa.daytime_satisfaction,
                sa.daytime_sleepy,
                sa.sleepy_freq,
                sa.insomnia_gate,
                sa.sleep_latency,
                sa.night_waking,
                sa.difficulty_back_sleep,
                sa.hypersomnia_gate,
                sa.difficulty_waking,
                sa.nap_freq,
                sa.nap_duration,
                sa.nap_refreshed,
                sa.snoring_gate,
                sa.witnessed_apnea,
                sa.loud_snoring,
                sa.night_awakenings,
                sa.morning_headache,
                sa.dry_mouth,
                sa.circadian_gate,
                sa.chronotype,
                sa.brain_fog,
                sa.weekend_shift,
                sa.duration,
                sr.sleep_opportunity,
                sr.osa_score,
                sr.osa_tier,
                sr.insomnia_score,
                sr.insomnia_tier,
                sr.hypersomnia_score,
                sr.hypersomnia_tier,
                sr.circadian_score,
                sr.circadian_tier,
                sr.circadian_subtypes,
                sr.primary_finding_label,
                sr.comorbidities,
                sr.submitted_at
            FROM patients p
            LEFT JOIN users u ON p.doctor_id = u.id
            LEFT JOIN screening_answers sa ON p.id = sa.patient_id
            LEFT JOIN screening_results sr ON p.id = sr.patient_id
            ORDER BY p.id DESC
            LIMIT 5;
        `;
        const res = await pool.query(query);
        console.log(`Fetched ${res.rows.length} patient rows successfully for Excel export!`);
        console.log('Sample Patient Row:');
        console.log(res.rows[0]);
        process.exit(0);
    } catch (e) {
        console.error('Export query error:', e.message);
        process.exit(1);
    }
}

testExportQuery();
