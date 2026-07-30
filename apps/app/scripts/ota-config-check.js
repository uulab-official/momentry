const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const failures = [];
const expo = require(path.join(appRoot, 'app.config.js'))();
const eas = JSON.parse(fs.readFileSync(path.join(appRoot, 'eas.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
const projectId = expo.extra?.eas?.projectId;

function equal(label, actual, expected) {
  if (actual !== expected) failures.push(`${label} expected ${expected}, got ${actual ?? 'missing'}`);
}

equal('owner', expo.owner, 'uulab');
equal('slug', expo.slug, 'momentry');
equal('runtimeVersion', expo.runtimeVersion, expo.version);
equal('updates.enabled', expo.updates?.enabled, true);
equal('updates.checkAutomatically', expo.updates?.checkAutomatically, 'NEVER');
equal('updates.fallbackToCacheTimeout', expo.updates?.fallbackToCacheTimeout, 0);
equal('EAS project ID', projectId, 'a8b8ccd6-0425-4ace-a84a-5c4d7f8e0d25');
equal('updates.url', expo.updates?.url, `https://u.expo.dev/${projectId}`);
equal('production build channel', eas.build?.production?.channel, 'production');

for (const name of ['update', 'update:msg', 'update:ios', 'update:android']) {
  const script = packageJson.scripts?.[name] ?? '';
  if (!script.includes('preflight:update') || !script.includes('guard:update')) {
    failures.push(`${name} must run preflight:update and guard:update before publishing`);
  }
}

if (failures.length) {
  console.error('OTA config check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('OTA config check passed.');
