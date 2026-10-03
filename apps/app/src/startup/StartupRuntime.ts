import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Font from 'expo-font';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { AppState, Linking, Platform } from 'react-native';

import { createNativeSplashHandoff } from './essential-startup';
import { createMomentryStartup } from './momentry-startup';
import { manifestCandidate } from './startup-ota';

export const STARTUP_DEADLINE_MS = 12_000;
export const STARTUP_OTA_MS = 8_000;
const RELOAD_FLOOR_KEY = 'momentry.startupReloadFloor';
let runtime: ReturnType<typeof createMomentryStartup> | undefined;
let initialLookupKnown = false, criticalFlow = false, appEntered = false;
let readableFrameReceived = false;
let initialLookup: Promise<void> = Promise.resolve();
const handoff = createNativeSplashHandoff(() => SplashScreen.hideAsync());

function loadFonts() {
  return Font.loadAsync({
    'Pretendard-100': require('../../assets/fonts/pretendard/Pretendard-Thin.otf'),
    'Pretendard-200': require('../../assets/fonts/pretendard/Pretendard-ExtraLight.otf'),
    'Pretendard-300': require('../../assets/fonts/pretendard/Pretendard-Light.otf'),
    'Pretendard-400': require('../../assets/fonts/pretendard/Pretendard-Regular.otf'),
    'Pretendard-500': require('../../assets/fonts/pretendard/Pretendard-Medium.otf'),
    'Pretendard-600': require('../../assets/fonts/pretendard/Pretendard-SemiBold.otf'),
    'Pretendard-700': require('../../assets/fonts/pretendard/Pretendard-Bold.otf'),
    'Pretendard-800': require('../../assets/fonts/pretendard/Pretendard-ExtraBold.otf'),
    'Pretendard-900': require('../../assets/fonts/pretendard/Pretendard-Black.otf'),
  });
}

export function getMomentryStartup() {
  if (runtime) return runtime;
  const lookupUntil = performance.now() + 600;
  let lookupTimer: ReturnType<typeof setTimeout> | undefined;
  let expireLookup: () => void = () => {};
  initialLookup = new Promise<void>(done => {
    function finish(unsafe: boolean) {
      if (performance.now() >= lookupUntil) unsafe = true;
      if (unsafe) criticalFlow = true;
      initialLookupKnown = true;
      if (lookupTimer !== undefined) clearTimeout(lookupTimer);
      done();
    }
    expireLookup = () => finish(true);
    lookupTimer = setTimeout(() => finish(true), 600);
    void Promise.all([
      Promise.resolve().then(() => {
        if (performance.now() >= lookupUntil) { finish(true); return null; }
        return Linking.getInitialURL();
      }),
      Platform.OS === 'web' ? Promise.resolve(null) : Promise.resolve().then(() => {
        if (performance.now() >= lookupUntil) { finish(true); return null; }
        return Notifications.getLastNotificationResponseAsync();
      }),
    ]).then(([url, notification]) => finish(Boolean(url || notification)), () => finish(true));
  });
  runtime = createMomentryStartup({
    facts: () => ({
      supported: !__DEV__ && Platform.OS !== 'web' && Constants.appOwnership !== 'expo' && Updates.isEnabled,
      projectId: Constants.easConfig?.projectId ?? null,
      runtimeVersion: Updates.runtimeVersion, runningUpdateId: Updates.updateId, isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      emergency: Updates.isEmergencyLaunch,
      restartCount: Updates.latestContext?.isRestarting ? Math.max(1, Updates.latestContext.restartCount) : Updates.latestContext?.restartCount ?? Number.NaN,
      checkAutomatically: Updates.checkAutomatically,
    }),
    prepare: () => {
      if (!initialLookupKnown && performance.now() >= lookupUntil) expireLookup();
      return initialLookup;
    },
    check: async () => { const result = await Updates.checkForUpdateAsync(); return result.isAvailable ? manifestCandidate(result.manifest, Updates.runtimeVersion) : null; },
    fetch: async () => { const result = await Updates.fetchUpdateAsync(); return result.isNew ? manifestCandidate(result.manifest, Updates.runtimeVersion) : null; },
    reload: () => Updates.reloadAsync(),
    storage: { get: key => AsyncStorage.getItem(key), set: (key, value) => AsyncStorage.setItem(key, value) },
    nativeSnapshot: () => {
      const context = Updates.latestContext;
      return {
        working: !!context && (context.isStartupProcedureRunning || context.isChecking || context.isDownloading),
        pending: context?.isUpdatePending ?? false,
        candidate: manifestCandidate(context?.downloadedManifest, Updates.runtimeVersion),
        downloadProgress: context?.isDownloading ? context.downloadProgress : undefined,
        error: !context || !!(context.rollback || context.checkError || context.downloadError),
      };
    },
    canReload: () => !appEntered && initialLookupKnown && !criticalFlow && AppState.currentState === 'active',
  }, {
    loadFonts,
    restoreFloor: async (until, current) => {
      if (!current() || performance.now() >= until) return null;
      const value = await AsyncStorage.getItem(RELOAD_FLOOR_KEY).catch(() => null);
      if (!current() || performance.now() >= until) return null;
      const floor = Number(value) || 0;
      return floor > 0 ? Math.min(floor, 0.94) : null;
    },
    clearFloor: async (until, current) => {
      if (current() && performance.now() < until) await AsyncStorage.removeItem(RELOAD_FLOOR_KEY).catch(() => undefined);
    },
    saveFloor: async (until, current) => {
      if (current() && performance.now() < until) await AsyncStorage.setItem(RELOAD_FLOOR_KEY, '0.88').catch(() => undefined);
    },
  }, { deadlineMs: STARTUP_DEADLINE_MS, otaMs: STARTUP_OTA_MS, fontMs: 5_000, finishMs: 430 });
  Updates.addUpdatesStateChangeListener(() => runtime?.observeNative());
  AppState.addEventListener('change', state => { if (state === 'background' || state === 'inactive') runtime?.closeOta('background'); });
  Linking.addEventListener('url', ({ url }) => { if (url) { criticalFlow = true; runtime?.closeOta('entry'); } });
  if (Platform.OS !== 'web') Notifications.addNotificationResponseReceivedListener(() => { criticalFlow = true; runtime?.closeOta('entry'); });
  return runtime;
}
export function momentryReadableFrame() {
  // Layout changes within one mount must not renew an exhausted native budget.
  if (readableFrameReceived) return;
  readableFrameReceived = true; handoff.resume(); handoff.frameReady();
}
export function disposeMomentrySplash() { readableFrameReceived = false; handoff.dispose(); }
export function markMomentryAppEntered() { appEntered = true; runtime?.markAppEntered(); }
