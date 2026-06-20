const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.log('Usage: node bump-version.js <version>');
  console.log('Example: node bump-version.js 1.2.7');
  process.exit(1);
}

const files = [
  {
    path: 'package.json',
    pattern: /("version"\s*:\s*")([^"]+)(")/,
    replace: `$1${version}$3`,
  },
  {
    path: 'package-lock.json',
    pattern: /("name"\s*:\s*"wintranslator",\s*"version"\s*:\s*")([^"]+)(")/,
    replace: `$1${version}$3`,
  },
  {
    path: 'src/shared/constants.ts',
    pattern: /(APP_VERSION\s*=\s*')([^']+)(')/,
    replace: `$1${version}$3`,
  },
];

let ok = true;
for (const f of files) {
  const fullPath = path.join(__dirname, f.path);
  const content = fs.readFileSync(fullPath, 'utf8');
  if (!f.pattern.test(content)) {
    console.log(`[SKIP] ${f.path} - pattern not found`);
    ok = false;
    continue;
  }
  fs.writeFileSync(fullPath, content.replace(f.pattern, f.replace));
  console.log(`[OK]   ${f.path} -> ${version}`);
}

if (ok) {
  console.log(`\nAll files updated to v${version}`);
} else {
  console.log('\nSome files were skipped.');
  process.exit(1);
}
