const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/patients/1/submit',
    method: 'POST'
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

req.end();