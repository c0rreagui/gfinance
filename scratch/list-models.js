const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load env variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const apiKey = env['GEMINI_API_KEY'];
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    // Note: The SDK doesn't expose listModels directly on the main class in some versions,
    // so we can fetch it via HTTP using the API key.
    const fetch = require('node-fetch'); // or use dynamic import or just standard https if node-fetch is not installed.
  } catch (e) {}

  // Let's use standard https module to query the models list endpoint
  const https = require('https');
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.models) {
          console.log('Available models:');
          response.models.forEach(m => {
            console.log(`- Name: ${m.name}, DisplayName: ${m.displayName}, SupportedMethods: ${m.supportedGenerationMethods}`);
          });
        } else {
          console.log('Error listing models:', response);
        }
      } catch (e) {
        console.error('Failed to parse response:', e.message);
        console.log('Raw response:', data);
      }
    });
  }).on('error', (err) => {
    console.error('HTTP Error:', err.message);
  });
}

run();
