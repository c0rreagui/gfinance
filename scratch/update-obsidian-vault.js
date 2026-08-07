const fs = require('fs');
const path = require('path');

const VAULT_DIR = 'E:\\Obsidian\\G-Hub vault\\G-Hub vault';

function walkDir(dir, callback) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    console.error(`Failed to read directory ${dir}:`, err.message);
    return;
  }

  files.forEach((file) => {
    const filepath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(filepath);
    } catch (err) {
      console.error(`Failed to stat file ${filepath}:`, err.message);
      return;
    }

    if (stat.isDirectory()) {
      walkDir(filepath, callback);
    } else if (stat.isFile() && filepath.endsWith('.md')) {
      callback(filepath);
    }
  });
}

console.log(`Starting Obsidian Vault search and replace at: ${VAULT_DIR}`);

let modifiedCount = 0;
let checkedCount = 0;

if (!fs.existsSync(VAULT_DIR)) {
  console.error(`Error: Vault directory "${VAULT_DIR}" does not exist.`);
  process.exit(1);
}

walkDir(VAULT_DIR, (filepath) => {
  checkedCount++;
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    let updatedContent = content;

    // Check and replace
    let modified = false;
    
    // Replace gfinance-lovat variants
    if (updatedContent.includes('gfinance-lovat.vercel.app')) {
      updatedContent = updatedContent.replaceAll('gfinance-lovat.vercel.app', 'ghub-ia.vercel.app');
      modified = true;
    }
    if (updatedContent.includes('gfinance-lovat')) {
      updatedContent = updatedContent.replaceAll('gfinance-lovat', 'ghub-ia');
      modified = true;
    }

    // Replace gfinance-loval variants
    if (updatedContent.includes('gfinance-loval.vercel.app')) {
      updatedContent = updatedContent.replaceAll('gfinance-loval.vercel.app', 'ghub-ia.vercel.app');
      modified = true;
    }
    if (updatedContent.includes('gfinance-loval')) {
      updatedContent = updatedContent.replaceAll('gfinance-loval', 'ghub-ia');
      modified = true;
    }

    // Replace other domain strings if found
    if (updatedContent.includes('gfinance.hub')) {
      updatedContent = updatedContent.replaceAll('gfinance.hub', 'ghub.hub');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filepath, updatedContent, 'utf-8');
      console.log(`[MODIFIED] ${path.relative(VAULT_DIR, filepath)}`);
      modifiedCount++;
    }
  } catch (err) {
    console.error(`Error processing file ${filepath}:`, err.message);
  }
});

console.log(`\nSearch and replace finished!`);
console.log(`- Checked: ${checkedCount} files`);
console.log(`- Modified: ${modifiedCount} files`);
