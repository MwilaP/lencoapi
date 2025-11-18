// Quick script to fix the LENCO_SECRET_KEY in .env file
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const correctKey = '0eb50e9ba217c46e3ea9296b13c3e51840bc100348bd4e6383802ff6f47ebcb4';

try {
  // Read current .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace the LENCO_SECRET_KEY line
  envContent = envContent.replace(
    /LENCO_SECRET_KEY=.*/,
    `LENCO_SECRET_KEY=${correctKey}`
  );
  
  // Write back to .env
  fs.writeFileSync(envPath, envContent, 'utf8');
  
  console.log('✅ LENCO_SECRET_KEY updated successfully!');
  console.log('Key:', correctKey);
  console.log('Length:', correctKey.length, 'characters');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
