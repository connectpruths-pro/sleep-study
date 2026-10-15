async function testLocalFlow() {
    const BASE = 'http://localhost:5000';
    console.log('Testing full screening submission against local backend...');

    try {
        // 1. Create Patient Draft
        const createRes = await fetch(`${BASE}/api/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: 'Local Test Patient',
                phone: '9876543210',
                email: 'testlocal@example.com',
                consent_given: true
            })
        });
        const createData = await createRes.json();
        console.log('Draft created:', createData.patient.id);
        const patientId = createData.patient.id;

        // 2. Save Answers via PATCH
        const saveRes = await fetch(`${BASE}/api/patients/${patientId}/answers`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                age: 45,
                gender: 'Male',
                height: 178,
                weight: 85,
                snoring_gate: 'Yes',
                witnessed_apnea: 'Yes',
                loud_snoring: 'Yes',
                duration: 'More than 1 year'
            })
        });
        const saveData = await saveRes.json();
        console.log('Answers saved:', saveData.success);

        // 3. Final Submit
        const submitRes = await fetch(`${BASE}/api/patients/${patientId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const submitData = await submitRes.json();
        console.log('Submit Status:', submitRes.status);
        console.log('Submit Success:', submitData.success);
        console.log('Calculated OSA Tier:', submitData.results?.osa?.tier);
        console.log('Primary Finding:', submitData.results?.osa?.name);
        process.exit(0);

    } catch (e) {
        console.error('Test failed:', e);
        process.exit(1);
    }
}

testLocalFlow();
