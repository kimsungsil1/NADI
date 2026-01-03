const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const UglifyJS = require('uglify-js');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = ROOT_DIR;
const DIST_DIR = path.resolve(ROOT_DIR, '_site');

const HTML_FILES = [
  'index.html',
  'about.html',
  'products.html',
  'franchise.html',
  'booking.html',
  'membership.html',
  'giftcard.html',
  'ai.html',
  'success.html',
  'fail.html',
  'admin.html',
];
const EN_HTML_FILES = HTML_FILES.map(f => `en/${f}`);

const ALL_HTML_FILES = [...HTML_FILES, ...EN_HTML_FILES.filter(f => fsSync.existsSync(path.join(SRC_DIR, f)))];

const NAV_LINKS = [
  { label: '예약하기', path: 'booking.html' },
  { label: '회원권', path: 'membership.html' },
  { label: '상품권', path: 'giftcard.html' },
  { label: 'AI 디자인', path: 'ai.html' },
];

async function minifyJs(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const result = UglifyJS.minify(content);
  if (result.error) throw result.error;
  return result.code;
}

function generateNavHtml(currentPath) {
  const depth = currentPath.split('/').length - 1;
  const prefix = depth > 0 ? '../'.repeat(depth) : './';

  const links = NAV_LINKS.map(({ label, path: navPath }) => {
    const isActive = navPath === currentPath.split('/').pop();
    const href = isActive ? '#' : `${prefix}${navPath}`;
    const className = isActive ? 'cta-button active' : 'cta-button';
    return `<a href="${href}" class="${className}">${label}</a>`;
  }).join('');

  return `<nav class="cta-nav" aria-label="주요 페이지 바로가기"><div class="cta-inner"><div class="cta-label">바로가기</div><div class="cta-links">${links}</div></div></nav>`;
}

async function build() {
  try {
    console.log('Starting build process...');
    await fs.mkdir(DIST_DIR, { recursive: true });

    // Copy all files
    const files = await fs.readdir(SRC_DIR);
    for (const file of files) {
      if (file === '_site' || file === 'node_modules' || file === '.git') continue;
      const srcPath = path.join(SRC_DIR, file);
      const distPath = path.join(DIST_DIR, file);
      await fs.cp(srcPath, distPath, { recursive: true });
    }

    // Process HTML files
    for (const file of ALL_HTML_FILES) {
      const filePath = path.join(DIST_DIR, file);
      let content = await fs.readFile(filePath, 'utf8');

      const navHtml = generateNavHtml(file);
      content = content.replace('<!-- NAV_PLACEHOLDER -->', navHtml);

      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Processed ${file}`);
    }

    // Minify JS
    const scriptPath = path.join(DIST_DIR, 'script.js');
    const minifiedScript = await minifyJs(scriptPath);
    await fs.writeFile(scriptPath, minifiedScript, 'utf8');
    console.log('✅ Minified script.js');


    console.log('Build process completed successfully.');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
