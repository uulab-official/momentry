#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(process.argv[2] || process.cwd());
const failures = [];
const warnings = [];
const inheritedEnv = new Set(Object.keys(process.env));

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function loadEnv(fileName) {
  const source = read(path.join(appRoot, fileName));
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match || inheritedEnv.has(match[1])) continue;
    process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

for (const fileName of ['.env', '.env.eas', '.env.local']) loadEnv(fileName);

const packagePath = path.join(appRoot, 'package.json');
if (!fs.existsSync(packagePath)) {
  console.error(`Missing package.json: ${packagePath}`);
  process.exit(1);
}

const pkg = JSON.parse(read(packagePath));
const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
const hasPackage = (name) => Boolean(dependencies[name]);
const enabled = (name) => ['1', 'true'].includes(String(process.env[name] || '').toLowerCase());
const configSource = [
  'app.json',
  'app.base.json',
  'app.config.js',
  'app.config.cjs',
  'app.config.ts',
].map((name) => read(path.join(appRoot, name))).join('\n');

function collectSourceFiles(root) {
  if (!fs.existsSync(root)) return [];
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (['node_modules', '.git', '.expo', 'dist', 'build', 'android', 'ios'].includes(entry.name)) continue;
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...collectSourceFiles(absolute));
    else if (/\.(?:js|jsx|mjs|cjs|ts|tsx)$/.test(entry.name)) output.push(absolute);
  }
  return output;
}

const sourceFiles = [...new Set([
  ...collectSourceFiles(path.join(appRoot, 'app')),
  ...collectSourceFiles(path.join(appRoot, 'src')),
])];
const sources = sourceFiles.map((file) => ({ file, source: read(file) }));
const allSource = sources.map(({ source }) => source).join('\n');

function findRepoRoot() {
  let current = appRoot;
  while (true) {
    if (fs.existsSync(path.join(current, 'supabase'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return appRoot;
    current = parent;
  }
}

const repoRoot = findRepoRoot();
const supabaseConfig = read(path.join(repoRoot, 'supabase', 'config.toml'));
const kakaoFunction = read(path.join(repoRoot, 'supabase', 'functions', 'kakao-auth', 'index.ts'));
const nativeGoogle = hasPackage('@react-native-google-signin/google-signin');
const nativeKakaoCore = hasPackage('@react-native-kakao/core');
const nativeKakaoUser = hasPackage('@react-native-kakao/user');
const nativeKakao = nativeKakaoCore || nativeKakaoUser;
const apple = hasPackage('expo-apple-authentication');
const hostedGoogle = enabled('EXPO_PUBLIC_ENABLE_GOOGLE_LOGIN') && !nativeGoogle;
const hostedKakao = enabled('EXPO_PUBLIC_ENABLE_KAKAO_LOGIN') && !nativeKakao;

if (apple) {
  if (!/usesAppleSignIn["']?\s*:\s*true/.test(configSource)) {
    failures.push('Apple auth package exists but ios.usesAppleSignIn is not true.');
  }
  if (!configSource.includes('expo-apple-authentication')) {
    failures.push('Apple auth package exists but the Expo config plugin is missing.');
  }
}

if (nativeGoogle) {
  if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
    failures.push('Native Google login requires EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
  }
  if (!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) {
    failures.push('Native Google login requires EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID for iOS.');
  }
  if (!configSource.includes('@react-native-google-signin/google-signin')) {
    failures.push('Native Google login requires its Expo config plugin.');
  }
  if (!allSource.includes('signInWithIdToken')) {
    failures.push('Native Google login must exchange its ID token with the auth backend.');
  }
}

if (nativeKakao) {
  if (!nativeKakaoCore || !nativeKakaoUser) {
    failures.push('Native Kakao login requires both @react-native-kakao/core and @react-native-kakao/user.');
  }
  if (!process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY) {
    failures.push('Native Kakao login requires EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY.');
  }
  if (!configSource.includes('@react-native-kakao/core')) {
    failures.push('Native Kakao login requires the @react-native-kakao/core Expo config plugin.');
  }
  if (!allSource.includes("'kakao-auth'") && !allSource.includes('"kakao-auth"')) {
    failures.push('Native Kakao login must exchange its access token through kakao-auth.');
  }
  if (!allSource.includes('setSession')) {
    failures.push('Native Kakao login must install the returned backend session.');
  }
  if (!kakaoFunction) failures.push('Missing supabase/functions/kakao-auth/index.ts.');
  if (!/\[functions\.kakao-auth\][\s\S]*?verify_jwt\s*=\s*false/.test(supabaseConfig)) {
    failures.push('kakao-auth must declare verify_jwt = false and validate the Kakao token itself.');
  }
  if (/\bdetail\s*:|String\((?:err|error)\)/.test(kakaoFunction)) {
    failures.push('kakao-auth must not return raw provider or internal error details.');
  }
}

if (hostedGoogle || hostedKakao) {
  if (!allSource.includes('signInWithOAuth')) {
    failures.push('Enabled hosted social login requires an implemented signInWithOAuth path.');
  }
  if (!allSource.includes('openAuthSessionAsync')) {
    failures.push('Hosted social login requires an in-app auth session.');
  }
  if (!allSource.includes('getInitialURL')) {
    failures.push('Hosted social login must recover the callback after a cold app start.');
  }
  const callbackRoute = [
    path.join(appRoot, 'app', 'auth', 'callback.tsx'),
    path.join(appRoot, 'app', 'auth', 'callback.ts'),
    path.join(appRoot, 'src', 'app', 'auth', 'callback.tsx'),
    path.join(appRoot, 'src', 'app', 'auth', 'callback.ts'),
  ].some(fs.existsSync);
  if (!callbackRoute) failures.push('Hosted social login requires a real auth/callback route.');
}

for (const { file, source } of sources) {
  if (!source.includes('openAuthSessionAsync')) continue;
  if (source.includes('dismissBrowser(')) {
    failures.push(`${path.relative(appRoot, file)} manually calls dismissBrowser(); let the auth session own browser cleanup.`);
  }
  if (source.includes("addEventListener('url'") || source.includes('addEventListener("url"')) {
    failures.push(`${path.relative(appRoot, file)} mixes auth-session and Linking callback ownership.`);
  }
}

if (!apple && !nativeGoogle && !nativeKakao && !hostedGoogle && !hostedKakao) {
  warnings.push('No Apple, Google, or Kakao login path is enabled.');
}

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (failures.length) {
  console.error('Social auth configuration check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const modes = [
  apple ? 'apple-native' : null,
  nativeGoogle ? 'google-native' : hostedGoogle ? 'google-hosted' : null,
  nativeKakao ? 'kakao-native' : hostedKakao ? 'kakao-hosted' : null,
].filter(Boolean);
console.log(`Social auth configuration check passed: ${modes.join(', ') || 'no providers enabled'}.`);
