const http = require('http');
const https = require('https');
const url = require('url');

const targetUrl = 'http://localhost:3000/api/mcp';

async function testSSE() {
  console.log('--- Testing GET /api/mcp with Accept: text/event-stream ---');
  return new Promise((resolve) => {
    const reqUrl = new URL(targetUrl);
    const options = {
      hostname: reqUrl.hostname,
      port: reqUrl.port,
      path: reqUrl.pathname,
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
      }
    };
    
    const req = http.request(options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
        console.log(`CHUNK: ${chunk.toString()}`);
        if (data.includes('endpoint')) {
           // success
           res.destroy(); // close connection
           resolve();
        }
      });
      
      res.on('end', () => {
        console.log('No more data in response.');
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.error(`problem with request: ${e.message}`);
      resolve();
    });
    
    req.end();
  });
}

async function run() {
  await testSSE();
  console.log('All tests finished.');
}

run();
