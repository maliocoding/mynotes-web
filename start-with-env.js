// Load .env before starting server
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8').split('\n').filter(Boolean);
  for (const line of env) {
    const i = line.indexOf('=');
    if (i > 0) {
      const key = line.slice(0, i).trim();
      const value = line.slice(i + 1).trim();
      process.env[key] = value;
    }
  }
}

require('./.next/standalone/server.js');
