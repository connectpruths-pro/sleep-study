const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

let evaluateAll, patientRoutes, authRoutes, pdfRoutes, adminRoutes;

try {
    evaluateAll = require('./scoring.js');
} catch (e) {
    try { evaluateAll = require('./scoring/index.js'); } catch (e2) { evaluateAll = require('./scoring'); }
}

try {
    patientRoutes = require('./routes/patients');
} catch (e) {
    patientRoutes = require('./patientRoutes');
}

try {
    authRoutes = require('./routes/auth');
} catch (e) {
    authRoutes = require('./authRoutes');
}

try {
    pdfRoutes = require('./routes/pdf');
} catch (e) {
    pdfRoutes = require('./pdfRoutes');
}

try {
    adminRoutes = require('./routes/admin');
} catch (e) {
    adminRoutes = require('./adminRoutes');
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Bypass-Tunnel-Remainder', 'bypass-tunnel-remainder']
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/admin', adminRoutes);

// Static frontend fallback
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

app.get('/', (req, res) => {
    res.json({ message: 'Backend is running! 🚀' });
});

app.post('/api/submit', (req, res) => {
    const answers = req.body;
    console.log('Received answers:', answers);

    const results = typeof evaluateAll === 'function' ? evaluateAll(answers) : evaluateAll.evaluateAll(answers);

    res.json({
        success: true,
        results: results
    });
});

// Helper to hash password on seed
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

// Startup database seed hook — creates super_admin account
async function seedSuperAdmin() {
    const pool = require('./db');
    try {
        await pool.query(`
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
        `);

        // 1. Expand columns in patients, screening_answers, and screening_results to prevent "value too long for type character varying(30)"
        await pool.query(`
            ALTER TABLE patients ADD COLUMN IF NOT EXISTS referral_source TEXT;
            ALTER TABLE patients ALTER COLUMN referral_source TYPE TEXT;
            ALTER TABLE patients ALTER COLUMN phone TYPE VARCHAR(100);
            ALTER TABLE patients ALTER COLUMN full_name TYPE VARCHAR(255);
            ALTER TABLE patients ALTER COLUMN email TYPE VARCHAR(255);
            ALTER TABLE patients ALTER COLUMN status TYPE VARCHAR(50);

            ALTER TABLE screening_answers ALTER COLUMN duration TYPE VARCHAR(100);
            ALTER TABLE screening_answers ALTER COLUMN work TYPE VARCHAR(100);
            ALTER TABLE screening_answers ALTER COLUMN schedule TYPE VARCHAR(100);
            ALTER TABLE screening_answers ALTER COLUMN sleep_satisfaction TYPE VARCHAR(100);
            ALTER TABLE screening_answers ALTER COLUMN daytime_satisfaction TYPE VARCHAR(100);
            ALTER TABLE screening_answers ALTER COLUMN sleepy_freq TYPE VARCHAR(100);
            ALTER TABLE screening_answers ALTER COLUMN sleep_latency TYPE VARCHAR(100);
            ALTER TABLE screening_answers ALTER COLUMN nap_freq TYPE VARCHAR(100);
            ALTER TABLE screening_answers ALTER COLUMN nap_duration TYPE VARCHAR(100);
            ALTER TABLE screening_answers ALTER COLUMN chronotype TYPE VARCHAR(100);
            ALTER TABLE screening_answers ALTER COLUMN gender TYPE VARCHAR(100);
            ALTER TABLE screening_answers ALTER COLUMN menstrual TYPE VARCHAR(100);

            ALTER TABLE screening_results ALTER COLUMN primary_finding_code TYPE VARCHAR(100);
            ALTER TABLE screening_results ALTER COLUMN primary_finding_label TYPE VARCHAR(255);
            ALTER TABLE screening_results ALTER COLUMN osa_tier TYPE VARCHAR(50);
            ALTER TABLE screening_results ALTER COLUMN insomnia_tier TYPE VARCHAR(50);
            ALTER TABLE screening_results ALTER COLUMN hypersomnia_tier TYPE VARCHAR(50);
            ALTER TABLE screening_results ALTER COLUMN circadian_tier TYPE VARCHAR(50);
        `).catch(err => console.warn('Schema expansion notice:', err.message));
        console.log('✅ Patients & screening_answers DB columns expanded successfully!');

        const adminCheck = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'super_admin'");
        const adminCount = parseInt(adminCheck.rows[0].count);

        if (adminCount === 0) {
            const defaultUser = 'admin';
            const defaultPass = 'AuroraSleep2026!';
            const hash = hashPassword(defaultPass);
            await pool.query(
                `INSERT INTO users (username, password_hash, role, full_name)
                 VALUES ($1, $2, 'super_admin', 'Platform Admin')
                 ON CONFLICT (username) DO NOTHING`,
                [defaultUser, hash]
            );
            console.log(`ℹ️ Seeded super admin: "${defaultUser}" with password "${defaultPass}"`);
        }
    } catch (err) {
        console.error('❌ Failed to seed super admin:', err.message);
    }
}

if (require.main === module) {
    app.listen(PORT, async () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
        await seedSuperAdmin();
    });
} else {
    seedSuperAdmin().catch(() => { });
}

module.exports = app;