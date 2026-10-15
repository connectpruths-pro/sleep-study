const http = require('http');

const data = JSON.stringify({
    age: 35,
    gender: 'Male',
    menstrual: null,
    height: 170,
    weight: 75,
    neck_raw: 34,
    medical: ['Hypertension', 'Thyroid disorder'],
    consumption: ['Medications', 'Caffeine'],
    work: 'Day shift',
    schedule: 'Irregular',
    sleep_start: null,
    wake_time: null,
    avg_sleep: 5,
    sleep_satisfaction: 'Satisfied',
    daytime_satisfaction: 'Very satisfied',
    daytime_sleepy: 'No',
    sleepy_freq: null,
    insomnia_gate: 'No',
    sleep_latency: null,
    night_waking: null,
    difficulty_back_sleep: null,
    hypersomnia_gate: 'No',
    difficulty_waking: null,
    nap_freq: null,
    nap_duration: null,
    nap_refreshed: null,
    snoring_gate: 'Yes',
    witnessed_apnea: 'Yes',
    loud_snoring: 'No',
    night_awakenings: 'No',
    morning_headache: 'No',
    dry_mouth: 'Yes',
    circadian_gate: 'No',
    chronotype: null,
    brain_fog: null,
    weekend_shift: null,
    duration: '2w-3m',
    completion_percent: 80,
    last_completed_step: 5
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/patients/1/answers',
    method: 'PATCH',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    let body = '';

    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response body:', body);
    });
});

req.on('error', (error) => {
    console.error('API test failed:', error.message);
});

req.write(data);
req.end();