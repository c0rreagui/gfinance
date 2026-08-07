const fs = require('fs');

console.log('Checking process.env variables:');
console.log(`- GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'Present (' + process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...)' : 'MISSING'}`);
console.log(`- GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? 'Present' : 'MISSING'}`);
console.log(`- GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Present' : 'MISSING'}`);

// Also check .env.local on disk
try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  console.log('\nChecking .env.local file content lines:');
  for (const line of envContent.split('\n')) {
    if (line.trim() && !line.startsWith('#')) {
      const parts = line.split('=');
      console.log(`- ${parts[0]}: ${parts[1] ? 'Defined' : 'Empty'}`);
    }
  }
} catch (e) {
  console.log('No .env.local found or error reading it.');
}
