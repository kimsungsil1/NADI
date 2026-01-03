const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '_site');
const requiredPages = ['booking.html', 'membership.html', 'giftcard.html', 'ai.html'];
const errors = [];

const logError = (message) => {
  errors.push(message);
  console.error(`❌ ${message}`);
};

const checkPageExists = (page) => {
  const pagePath = path.join(root, page);
  if (!fs.existsSync(pagePath)) {
    logError(`Missing required page in _site: ${page}`);
  }
};

const verifyNavLinks = () => {
  const indexPath = path.join(root, 'index.html');
  if (!fs.existsSync(indexPath)) {
    logError('Missing index.html in _site');
    return;
  }
  const contents = fs.readFileSync(indexPath, 'utf8');
  for (const page of requiredPages) {
    if (!contents.includes(`href="./${page}"`)) {
      logError(`Missing navigation link to ${page} in _site/index.html`);
    }
  }
};

requiredPages.forEach(checkPageExists);
verifyNavLinks();

if (errors.length) {
  console.error(`\nVerification failed with ${errors.length} issue(s).`);
  process.exit(1);
}

console.log('✅ All required pages and links are present in the _site directory.');
