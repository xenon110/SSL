const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/outstandings?companyName=' + encodeURIComponent('SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)'),
  method: 'GET'
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log("Status:", res.statusCode, "\nResponse:", data.substring(0, 500)));
});

req.on('error', error => console.error(error));
req.end();
