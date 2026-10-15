async function inspectAnswersRoute() {
    const BASE = 'https://sleep-aurora1.onrender.com';
    const createRes = await fetch(`${BASE}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            full_name: 'Debug Patient',
            phone: '9876543210',
            consent_given: true
        })
    });
    const cData = await createRes.json();
    const patientId = cData.patient.id;

    console.log('Created patient:', patientId);
    const saveRes = await fetch(`${BASE}/api/patients/${patientId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age: 30, gender: 'Male' })
    });
    console.log('Save Status:', saveRes.status);
    console.log('Save Body:', await saveRes.text());
}
inspectAnswersRoute();
