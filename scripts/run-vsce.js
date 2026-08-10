#!/usr/bin/env node
/**
 * Run the vendored @vscode/vsce (2.32).
 * npm 11 crashes while resolving vsce 3.x (secretlint peer walk),
 * so we install vsce with yarn under tools/vsce.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const toolDir = path.join(root, 'tools', 'vsce');
const bin = path.join(toolDir, 'node_modules', '.bin', 'vsce');

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!fs.existsSync(bin)) {
  const yarn = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
  console.log('Installing local @vscode/vsce via yarn (one-time)...');
  run(yarn, ['install', '--frozen-lockfile'], toolDir);
}

run(bin, process.argv.slice(2), root);
