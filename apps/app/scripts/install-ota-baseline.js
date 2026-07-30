#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const appRoot = path.resolve(__dirname, '..');
const packagePath = path.join(appRoot, 'package.json');
const lockPath = path.join(appRoot, 'package-lock.json');
const baselinePath = path.join(__dirname, 'ota-native-baseline.json');

const manifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const lockText = fs.readFileSync(lockPath, 'utf8');
const lock = JSON.parse(lockText);
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const expectedLockHash = baseline.files?.['package-lock.json'];
const actualLockHash = crypto.createHash('sha256').update(lockText).digest('hex');

if (!expectedLockHash || actualLockHash !== expectedLockHash) {
  console.error(
    `Refusing OTA baseline install: package-lock.json does not match the verified store baseline.\n` +
      `Expected: ${expectedLockHash ?? 'missing'}\nActual:   ${actualLockHash}`,
  );
  process.exit(1);
}

const packageNames = new Set([
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.devDependencies ?? {}),
  'expo-asset',
]);

const exactPackages = [...packageNames].map((packageName) => {
  const version = lock.packages?.[`node_modules/${packageName}`]?.version;
  if (!version) {
    throw new Error(`Missing locked version for ${packageName}`);
  }
  return `${packageName}@${version}`;
});

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(
  npmCommand,
  ['install', '--no-save', '--package-lock=false', ...exactPackages],
  { cwd: appRoot, stdio: 'inherit' },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
