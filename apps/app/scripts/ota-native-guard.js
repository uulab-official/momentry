#!/usr/bin/env node

const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const baselinePath = path.join(__dirname, 'ota-native-baseline.json');
const nativeSensitivePatterns = [
  /^\.env($|\.)/,
  /^app\.json$/,
  /^app\.base\.json$/,
  /^app\.config\.(js|ts|mjs|cjs)$/,
  /^eas\.json$/,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^yarn\.lock$/,
  /^pnpm-lock\.yaml$/,
  /^ios\//,
  /^android\//,
  /^plugins\//,
  /^credentials\.json$/,
  /^credentials\//,
  /^GoogleService-Info\.plist$/,
  /^google-services\.json$/,
  /^firebase\.json$/,
  /^assets\/images\/(icon|adaptive-icon|android-icon|splash|splash-icon|favicon)/,
];
const nativeSensitivePackageFields = [
  'main',
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'overrides',
  'resolutions',
  'expo',
  'react-native',
];

function git(args) {
  return execFileSync('git', args, {
    cwd: appRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

function normalizeAppPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.startsWith('apps/app/') ? normalized.slice('apps/app/'.length) : normalized;
}

function nulPaths(output) {
  return output.split('\0').filter(Boolean).map(normalizeAppPath);
}

function workingTreePaths() {
  return [
    ...nulPaths(git(['diff', '--name-only', '-z', '--', '.'])),
    ...nulPaths(git(['diff', '--cached', '--name-only', '-z', '--', '.'])),
    ...nulPaths(git(['ls-files', '--others', '--exclude-standard', '-z', '--', '.'])),
  ];
}

function committedPaths() {
  if (process.env.OTA_SKIP_COMMITTED_DIFF === '1') return [];
  const base = process.env.OTA_BASE_SHA || 'HEAD^';
  const head = process.env.OTA_HEAD_SHA || 'HEAD';
  try {
    git(['rev-parse', '--verify', `${base}^{commit}`]);
  } catch {
    console.warn(`No OTA base commit is available for ${base}; checking the working tree only.`);
    return [];
  }
  return nulPaths(git(['diff', '--name-only', '-z', base, head, '--', '.']));
}

function isNativeSensitive(filePath) {
  return nativeSensitivePatterns.some((pattern) => pattern.test(filePath));
}

function packageManifestHasNativeChanges(beforeSource, afterSource) {
  try {
    const before = JSON.parse(beforeSource);
    const after = JSON.parse(afterSource);
    return nativeSensitivePackageFields.some((field) =>
      JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null));
  } catch {
    return true;
  }
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}

function packageNativeConfigHash() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
  const nativeConfig = Object.fromEntries(
    nativeSensitivePackageFields
      .filter((field) => packageJson[field] !== undefined)
      .map((field) => [field, packageJson[field]]),
  );
  return crypto.createHash('sha256').update(JSON.stringify(sortJson(nativeConfig))).digest('hex');
}

function fileHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(appRoot, filePath))).digest('hex');
}

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) return null;
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  if (!baseline.runtimeVersion || !baseline.buildCode || !baseline.packageNativeConfigSha256 || !baseline.files) {
    throw new Error('OTA native baseline is incomplete.');
  }
  return baseline;
}

function matchesBaseline(filePath, baseline) {
  if (!baseline) return false;
  if (filePath === 'package.json') return packageNativeConfigHash() === baseline.packageNativeConfigSha256;
  const expected = baseline.files[filePath];
  const absolutePath = path.join(appRoot, filePath);
  return typeof expected === 'string' && fs.existsSync(absolutePath) && fileHash(filePath) === expected;
}

function repoPackagePath() {
  return `${git(['rev-parse', '--show-prefix']).trim()}package.json`;
}

function packageAt(ref) {
  return git(['show', `${ref}:${repoPackagePath()}`]);
}

function checkPackageManifest(changed, working, committed) {
  if (!changed.includes('package.json')) return false;
  let risky = false;
  if (working.includes('package.json')) {
    try {
      risky ||= packageManifestHasNativeChanges(
        packageAt('HEAD'),
        fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'),
      );
    } catch {
      risky = true;
    }
  }
  if (committed.includes('package.json')) {
    const base = process.env.OTA_BASE_SHA || 'HEAD^';
    const head = process.env.OTA_HEAD_SHA || 'HEAD';
    try {
      risky ||= packageManifestHasNativeChanges(packageAt(base), packageAt(head));
    } catch {
      risky = true;
    }
  }
  if (!risky) console.log('package.json changed only in OTA-safe metadata or scripts.');
  return risky;
}

function main() {
  let working;
  let committed;
  try {
    working = workingTreePaths();
    committed = committedPaths();
  } catch (error) {
    console.error(`Could not inspect changed files: ${error.message}`);
    return 1;
  }

  const changed = [...new Set([...working, ...committed])];
  const risky = changed.filter((filePath) => filePath !== 'package.json' && isNativeSensitive(filePath));
  if (checkPackageManifest(changed, working, committed)) risky.push('package.json');

  let baseline;
  try {
    baseline = loadBaseline();
  } catch (error) {
    console.error(error.message);
    return 1;
  }
  const baselineMatched = risky.filter((filePath) => matchesBaseline(filePath, baseline));
  const unmatched = risky.filter((filePath) => !matchesBaseline(filePath, baseline));
  if (baselineMatched.length) {
    console.log(`Native-sensitive files match the verified store baseline ${baseline.runtimeVersion} (${baseline.buildCode}):`);
    baselineMatched.forEach((filePath) => console.log(`- ${filePath}`));
  }

  if (process.env.ALLOW_NATIVE_OTA === '1') {
    console.warn('ALLOW_NATIVE_OTA=1 set. Native-sensitive OTA guard was explicitly overridden.');
    risky.forEach((filePath) => console.warn(`- ${filePath}`));
    return 0;
  }
  if (unmatched.length > 0) {
    console.error('OTA blocked because native-sensitive files changed:');
    unmatched.forEach((filePath) => console.error(`- ${filePath}`));
    console.error('Build a new binary for this change. Do not use OTA for native-sensitive changes.');
    return 1;
  }
  console.log(`OTA native-change guard passed (${changed.length} changed file${changed.length === 1 ? '' : 's'} checked).`);
  return 0;
}

process.exit(main());
