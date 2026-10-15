async function testLocal() {
    try {
        const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'adithishivkumar19@gmail.com' })
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Data:', data);
        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
}
testLocal();
