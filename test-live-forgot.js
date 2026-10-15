async function testLiveEndpoint() {
    try {
        const res = await fetch('https://sleep-aurora1.onrender.com/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'adithishivkumar19@gmail.com' })
        });
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Body:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}
testLiveEndpoint();
