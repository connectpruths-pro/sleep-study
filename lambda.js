// backend/lambda.js
const serverless = require('serverless-http');
const app = require('./server');

// Wrap the Express app with serverless-http for AWS Lambda execution
module.exports.handler = serverless(app);
