const crypto = require('crypto');

async function testLiveLogin() {
    console.log('Testing login request against https://sleep-aurora1.onrender.com/api/auth/login ...');
    
    const usernames = ['clinician', 'Platform Admin', 'Aurora Sleep', 'admin'];
    const password = 'AuroraSleep2026!';

    for (const u of usernames) {
        try {
            const res = await fetch('https://sleep-aurora1.onrender.com/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: password })
            });

            const data = await res.json();
            console.log(`Username: "${u}" | HTTP ${res.status} | Response:`, data);
        } catch (err) {
            console.error(`Error testing username "${u}":`, err.message);
        }
    }
    process.exit(0);
}

testLiveLogin();
