#!/usr/bin/env node
// Pack source code for migration — excludes build artifacts and dependencies.
// Usage: node pack.js
// Output: WinTranslator-src-YYYYMMDD-HHmmss.tar.gz

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectDir = __dirname;
const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'));
const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13);
const archiveName = `WinTranslator-src-${timestamp}.tar.gz`;
const outputPath = path.join(path.dirname(projectDir), archiveName);

const exclude = [
  'node_modules',
  'dist',
  'dist-electron',
  'release',
  '.git',
  '.DS_Store',
  '.setup-done',
  '*.log',
];

const excludeArgs = exclude.map((e) => `--exclude=${e}`).join(' ');
const cmd = `tar ${excludeArgs} -czf "${outputPath}" -C "${path.dirname(projectDir)}" "${path.basename(projectDir)}"`;

console.log(`Packing ${pkg.name} v${pkg.version} ...`);
execSync(cmd, { stdio: 'inherit' });

const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log(`\nDone: ${outputPath} (${sizeMB} MB)`);
