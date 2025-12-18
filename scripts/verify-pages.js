const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredPages = ['booking.html', 'membership.html', 'giftcard.html', 'ai.html'];
const errors = [];

const logError = (message) => {
  errors.push(message);
  console.error(`❌ ${message}`);
};

const checkPageExists = (page) => {
  const pagePath = path.join(root, page);
  if (!fs.existsSync(pagePath)) {
    logError(`Missing required page: ${page}`);
  }
};

const shouldSkipDir = (dir) => ['node_modules', '.git', 'dist'].includes(dir);

const collectHtmlFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      files.push(...collectHtmlFiles(path.join(dir, entry.name)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      files.push(path.join(dir, entry.name));
    }
  }

  return files;
};

const verifyLinks = (filePath) => {
  const contents = fs.readFileSync(filePath, 'utf8');
  if (!contents.includes('booking.html')) {
    const relativePath = path.relative(root, filePath);
    logError(`No booking link found in ${relativePath}`);
  }
};

requiredPages.forEach(checkPageExists);

const htmlFiles = collectHtmlFiles(root);
htmlFiles.forEach(verifyLinks);

if (errors.length) {
  console.error(`\nVerification failed with ${errors.length} issue(s).`);
  process.exit(1);
}

console.log('✅ All required pages and links are present.');
