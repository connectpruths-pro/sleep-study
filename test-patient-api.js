async function testPatientAPI() {
    try {
        const response = await fetch('http://localhost:5000/api/patients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                full_name: 'Test Patient',
                phone: '9876543210',
                email: 'test@example.com',
                consent_given: true
            }),
        });

        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('API test failed:', error.message);
    }
}

testPatientAPI();