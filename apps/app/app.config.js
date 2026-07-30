const fs = require('fs');
const path = require('path');
const base = require('./app.base.json');

function loadEnvFile(fileName) {
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (process.env[key] == null) process.env[key] = value;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;

function googleIosUrlScheme(clientId) {
  if (!clientId) return null;
  if (clientId.startsWith('com.googleusercontent.apps.')) return clientId;
  if (clientId.endsWith('.apps.googleusercontent.com')) {
    return `com.googleusercontent.apps.${clientId.replace('.apps.googleusercontent.com', '')}`;
  }
  return clientId;
}

module.exports = () => {
  const expo = JSON.parse(JSON.stringify(base.expo));
  const otaRuntimeVersion = process.env.EXPO_OTA_RUNTIME_VERSION;
  const easProjectId = process.env.EAS_PROJECT_ID || expo.extra?.eas?.projectId;
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ||
    (fs.existsSync(path.join(__dirname, 'google-services.json')) ? './google-services.json' : null);
  const iosUrlScheme = googleIosUrlScheme(googleIosClientId);

  if (otaRuntimeVersion) expo.runtimeVersion = otaRuntimeVersion;

  if (easProjectId) {
    expo.extra = { ...expo.extra, eas: { projectId: easProjectId } };
    expo.updates = { ...expo.updates, url: `https://u.expo.dev/${easProjectId}` };
  }

  if (googleServicesFile) {
    expo.android = { ...expo.android, googleServicesFile };
  }

  if (iosUrlScheme) {
    expo.plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
  }

  if (kakaoNativeAppKey) {
    expo.plugins.push(['@react-native-kakao/core', { nativeAppKey: kakaoNativeAppKey }]);
  }

  return expo;
};
