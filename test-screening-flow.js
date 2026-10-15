async function testSubmitDirect() {
    const BASE = 'https://sleep-aurora1.onrender.com';
    console.log('Testing full screening submission against Render backend:', BASE);

    try {
        // 1. Create Patient Draft
        console.log('Step 1: Creating draft patient...');
        const createRes = await fetch(`${BASE}/api/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: 'Direct Submit Test',
                phone: '9876543210',
                email: 'test@example.com',
                consent_given: true
            })
        });
        const createData = await createRes.json();
        console.log('Draft created:', createData);
        const patientId = createData.patient.id;

        // 2. Save Answers with PATCH
        console.log(`Step 2: Saving screening answers via PATCH for patient ID ${patientId}...`);
        const saveRes = await fetch(`${BASE}/api/patients/${patientId}/answers`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                age: 35,
                gender: 'Male',
                height: 175,
                weight: 80,
                snoring_gate: 'Yes',
                witnessed_apnea: 'Yes',
                loud_snoring: 'Yes',
                duration: 'More than 1 year'
            })
        });
        const saveData = await saveRes.json();
        console.log('Answers saved successfully:', saveData.success);

        // 3. Final Submit
        console.log(`Step 3: Final screening submit for patient ID ${patientId}...`);
        const submitRes = await fetch(`${BASE}/api/patients/${patientId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        console.log('Submit Response Status:', submitRes.status);
        console.log('Submit Response Body:', await submitRes.text());

    } catch (e) {
        console.error('Flow failed:', e);
    }
}

testSubmitDirect();
