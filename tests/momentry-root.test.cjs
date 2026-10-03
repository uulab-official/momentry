const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require(process.env.STARTUP_QA_TYPESCRIPT || 'typescript');
const reactPath = process.env.STARTUP_QA_REACT || 'react';
const React = require(reactPath);
const Renderer = require(process.env.STARTUP_QA_RENDERER || 'react-test-renderer');
const jsx = require(reactPath === 'react' ? 'react/jsx-runtime' : path.join(reactPath, 'jsx-runtime'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { act } = Renderer;
const base = path.resolve(__dirname, '../apps/app');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function fixture(options = {}) {
  const font = deferred(), retryFont = deferred(), check = deferred(), url = deferred(), notification = deferred(), floor = deferred(), writeFloor = deferred();
  let now = 0, id = 0, loads = 0, hides = 0, checks = 0, fetches = 0, reloads = 0, urlReads = 0, notificationReads = 0;
  let loaded = false;
  const timers = new Map(), cache = new Map(), events = {}, reads = [], removes = [], writes = [], fontMaps = [];
  const project = '11111111-1111-4111-8111-111111111111', candidate = '22222222-2222-4222-8222-222222222222';
  const context = { restartCount: 0, isRestarting: false, isStartupProcedureRunning: false, isChecking: false, isDownloading: false, isUpdatePending: false };
  const appState = { currentState: 'active', addEventListener: (name, callback) => { events.appState = callback; return { remove() {} }; } };
  class Value {
    constructor(value) { this.value = value; this.listeners = new Map(); }
    addListener(fn) { const key = String(++id); this.listeners.set(key, fn); return key; }
    removeListener(key) { this.listeners.delete(key); }
    interpolate() { return this.value; }
  }
  const pass = name => ({ children }) => React.createElement(name, null, children);
  const updates = {
    isEnabled: true, runtimeVersion: '1.0.0', updateId: options.runningCandidate ? candidate : null, isEmbeddedLaunch: !options.runningCandidate, isEmergencyLaunch: false, checkAutomatically: options.policy || 'NEVER', latestContext: context,
    checkForUpdateAsync: () => { checks++; return options.checkNow ? Promise.resolve(options.checkNow) : check.promise; },
    fetchUpdateAsync: async () => { fetches++; context.isUpdatePending = true; context.downloadedManifest = { id: candidate }; return { isNew: true, manifest: context.downloadedManifest }; },
    reloadAsync: () => { reloads++; return new Promise(() => {}); },
    addUpdatesStateChangeListener: fn => { events.native = fn; return { remove() {} }; },
  };
  const mocks = {
    react: React, 'react/jsx-runtime': jsx, 'react-native-reanimated': {},
    'react-native': { View: 'View', Text: 'Text', Image: 'Image', Pressable: 'Pressable', StyleSheet: { create: x => x }, Platform: { OS: 'ios' }, AppState: appState,
      Linking: { getInitialURL: () => { urlReads++; return url.promise; }, addEventListener: (name, fn) => { events.url = fn; return { remove() {} }; } },
      Animated: { Value, View: 'AnimatedView', timing: (value, config) => ({ start() { value.value = config.toValue; for (const fn of value.listeners.values()) fn({ value: value.value }); }, stop() {} }) } },
    '@react-native-async-storage/async-storage': { getItem: key => { reads.push(key); return key === 'momentry.startupReloadFloor' && options.stallFloor ? floor.promise : Promise.resolve(options.runningCandidate && key.startsWith('uulab.ota.') ? JSON.stringify({ state: 'attempted', candidateId: candidate, projectId: project, runtimeVersion: '1.0.0' }) : null); }, setItem: async (key, value) => { writes.push([key, value]); if (key === 'momentry.startupReloadFloor' && options.stallFloorWrite) await writeFloor.promise; }, removeItem: async key => { removes.push(key); } },
    'expo-constants': { appOwnership: 'standalone', easConfig: { projectId: project } },
    'expo-font': { useFonts: () => [loaded, null], loadAsync: map => { loads++; fontMaps.push(map); return loads === 1 ? font.promise : retryFont.promise; }, isLoaded: () => loaded },
    'expo-splash-screen': { preventAutoHideAsync: async () => {}, hideAsync: async () => { hides++; if (hides <= (options.hideFailures || 0)) throw Error('transient hide'); } },
    'expo-notifications': { getLastNotificationResponseAsync: () => { notificationReads++; return notification.promise; }, addNotificationResponseReceivedListener: fn => { events.notification = fn; return { remove() {} }; } },
    'expo-updates': updates,
    'expo-router': { DefaultTheme: { dark: false }, Stack: Object.assign(pass('Stack'), { Screen: 'Screen' }), ThemeProvider: pass('RouterThemeProvider') },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    '@/src/providers/EntriesProvider': { EntriesProvider: pass('EntriesProvider') },
    '@/src/providers/ThemeProvider': { AppThemeProvider: pass('AppThemeProvider'), useAppTheme: () => ({ colors: { background: '#F7F8F7', text: '#17201C', textMuted: '#66716C', surfaceMuted: '#F0F3F1', primary: '#24513F' }, hydrated: true }) },
    '@/src/components/NotificationObserver': { NotificationObserver: () => React.createElement('NotificationObserver') },
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const localRequire = name => {
      if (name in mocks) return mocks[name];
      if (name.includes('/assets/')) return name;
      const prefix = name.startsWith('@/') ? path.join(base, name.slice(2)) : name.startsWith('.') ? path.resolve(path.dirname(file), name) : null;
      if (prefix) for (const ext of ['', '.ts', '.tsx']) if (fs.existsSync(prefix + ext) && fs.statSync(prefix + ext).isFile()) return load(prefix + ext);
      throw Error('Missing mock or source: ' + name);
    };
    vm.runInNewContext('(function(require,module,exports){' + source + '\n})', { __DEV__: false, console, performance: { now: () => now }, setTimeout: (fn, ms) => { const key = ++id; timers.set(key, { fn, due: now + ms }); return key; }, clearTimeout: key => timers.delete(key) })(localRequire, module, module.exports);
    return module.exports;
  }
  const Root = load(path.join(base, 'app/_layout.tsx')).default;
  return { Root, font, retryFont, check, url, notification, floor, writeFloor, context, updates, events, reads, removes, writes, fontMaps,
    counts: () => ({ loads, hides, checks, fetches, reloads }),
    lookups: () => ({ urlReads, notificationReads }),
    warmRuntime: () => load(path.join(base, 'src/startup/StartupRuntime.ts')).getMomentryStartup(),
    resolveFont: () => { loaded = true; font.resolve(); },
    safeLinks: () => { url.resolve(null); notification.resolve(null); },
    setNow: value => { now = value; },
    tick: value => { now = value; for (const [key, timer] of [...timers]) if (timer.due <= now) { timers.delete(key); timer.fn(); } },
  };
}
const alert = tree => tree.root.findAllByType('View').find(view => view.props.accessibilityRole === 'alert');
const navigation = tree => tree.root.findAllByType('Stack');
const mount = async f => { let tree; await act(async () => { tree = Renderer.create(React.createElement(f.Root)); }); return tree; };
test('actual root exposes system-font recovery at 5 seconds and hides only from its readable layout', async () => {
  const f = fixture(), tree = await mount(f);
  assert.equal(f.counts().hides, 0); assert.equal(navigation(tree).length, 0);
  await act(async () => f.tick(5000)); assert.ok(alert(tree));
  assert.equal(navigation(tree).length, 0); assert.equal(f.counts().hides, 0);
  await act(async () => alert(tree).props.onLayout()); assert.equal(f.counts().hides, 1);
  for (const text of tree.root.findAllByType('Text')) assert.ok(!JSON.stringify(text.props.style).includes('Pretendard'));
  await act(async () => tree.unmount());
});
test('recovery retry shares the actual pending nine-font load and eventual readiness enters without reopening OTA', async () => {
  const f = fixture(), tree = await mount(f); f.safeLinks();
  await act(async () => f.tick(5000)); assert.ok(alert(tree));
  await act(async () => tree.root.findByType('Pressable').props.onPress()); assert.equal(f.counts().loads, 1);
  await act(async () => f.tick(10000)); assert.ok(alert(tree));
  await act(async () => f.resolveFont()); await act(async () => f.tick(10430));
  assert.equal(navigation(tree).length, 1); assert.equal(f.counts().checks, 0); assert.equal(f.counts().reloads, 0);
  assert.equal(Object.keys(f.fontMaps[0]).length, 9); await act(async () => tree.unmount());
});
test('root remount shares pending fonts, seals OTA on disposal and preserves provider ordering', async () => {
  const f = fixture(); let tree = await mount(f); await act(async () => tree.unmount()); tree = await mount(f);
  assert.equal(f.counts().loads, 1); await act(async () => { f.safeLinks(); f.resolveFont(); });
  await act(async () => f.tick(430)); assert.equal(navigation(tree).length, 1); assert.equal(f.counts().checks, 0);
  const app = tree.root.findByType('AppThemeProvider'), entries = app.findByType('EntriesProvider'); assert.equal(entries.findAllByType('Stack').length, 1);
  assert.equal(tree.root.findByType('StatusBar').props.style, 'dark'); await act(async () => tree.unmount());
});
test('whole startup budget begins before fonts and no delayed check can reload after the 12-second boundary', async () => {
  const f = fixture(), tree = await mount(f); await act(async () => f.safeLinks());
  await act(async () => { f.setNow(4900); f.resolveFont(); }); assert.equal(f.counts().checks, 1);
  await act(async () => { f.setNow(12000); f.check.resolve({ isAvailable: true, manifest: { id: '22222222-2222-4222-8222-222222222222' } }); });
  assert.equal(f.counts().fetches, 0); assert.equal(f.counts().reloads, 0); assert.equal(navigation(tree).length, 1);
  await act(async () => tree.unmount());
});
test('late null initial URL and notification results do not reopen safety after 600ms without timer delivery', async () => {
  const f = fixture(), tree = await mount(f); await act(async () => { f.setNow(600); f.safeLinks(); f.resolveFont(); });
  assert.equal(f.counts().checks, 0); await act(async () => f.tick(1030)); assert.equal(navigation(tree).length, 1);
  await act(async () => tree.unmount());
});
test('late cosmetic floor read cannot delete or extend its outer 400ms acquisition budget', async () => {
  const f = fixture({ stallFloor: true }), tree = await mount(f); await act(async () => { f.safeLinks(); f.resolveFont(); });
  await act(async () => { f.setNow(400); f.floor.resolve('0.88'); });
  assert.deepEqual(f.removes, []); await act(async () => tree.unmount());
});
test('native hide transient rejection receives bounded retries from the same readable frame', async () => {
  const f = fixture({ hideFailures: 1 }), tree = await mount(f); await act(async () => f.tick(5000));
  await act(async () => alert(tree).props.onLayout()); assert.equal(f.counts().hides, 1);
  await act(async () => f.tick(5180)); assert.equal(f.counts().hides, 2); await act(async () => tree.unmount());
});
test('background and notification activity seal an in-flight update before fetch or reload', async () => {
  const f = fixture(), tree = await mount(f); await act(async () => { f.safeLinks(); f.resolveFont(); }); assert.equal(f.counts().checks, 1);
  await act(async () => { f.events.notification({}); f.events.appState('background'); f.check.resolve({ isAvailable: true, manifest: { id: '22222222-2222-4222-8222-222222222222' } }); });
  assert.equal(f.counts().fetches, 0); assert.equal(f.counts().reloads, 0); await act(async () => tree.unmount());
});
test('StrictMode effect replay leaves a live recovery session sharing the font owner', async () => {
  const f = fixture(); let tree;
  await act(async () => { tree = Renderer.create(React.createElement(React.StrictMode, null, React.createElement(f.Root))); });
  assert.equal(f.counts().loads, 1); await act(async () => f.tick(5000)); assert.ok(alert(tree));
  await act(async () => f.resolveFont()); await act(async () => f.tick(5430));
  assert.equal(navigation(tree).length, 1); assert.equal(f.counts().checks, 0); await act(async () => tree.unmount());
});
test('font rejection shows recovery and a settled retry loads exactly one new attempt', async () => {
  const f = fixture(), tree = await mount(f); await act(async () => f.font.reject(Error('font unavailable')));
  assert.ok(alert(tree)); assert.equal(navigation(tree).length, 0);
  await act(async () => tree.root.findByType('Pressable').props.onPress()); assert.equal(f.counts().loads, 2);
  await act(async () => f.retryFont.resolve()); await act(async () => f.tick(430));
  assert.equal(navigation(tree).length, 1); assert.equal(f.counts().checks, 0); await act(async () => tree.unmount());
});
test('manual OTA check and fetch share one 8-second window and preserve the 430ms finish', async () => {
  const f = fixture(), tree = await mount(f); await act(async () => { f.safeLinks(); f.resolveFont(); });
  await act(async () => f.tick(8000)); assert.equal(navigation(tree).length, 0);
  await act(async () => f.tick(8429)); assert.equal(navigation(tree).length, 0);
  await act(async () => f.tick(8430)); assert.equal(navigation(tree).length, 1);
  await act(async () => f.check.resolve({ isAvailable: true, manifest: { id: '22222222-2222-4222-8222-222222222222' } }));
  assert.equal(f.counts().fetches, 0); assert.equal(f.counts().reloads, 0); await act(async () => tree.unmount());
});
test('native pending candidate is journaled once and retains the exact legacy cosmetic floor before reload', async () => {
  const f = fixture({ policy: 'ON_LOAD' }), tree = await mount(f);
  Object.assign(f.context, { isUpdatePending: true, downloadedManifest: { id: '22222222-2222-4222-8222-222222222222' } });
  await act(async () => { f.safeLinks(); f.resolveFont(); });
  assert.equal(f.counts().checks, 0); assert.equal(f.counts().fetches, 0); assert.equal(f.counts().reloads, 1);
  assert.ok(f.writes.some(([key, value]) => key.startsWith('uulab.ota.') && JSON.parse(value).state === 'attempted'));
  assert.ok(f.writes.some(([key, value]) => key === 'momentry.startupReloadFloor' && value === '0.88'));
  await act(async () => f.events.native()); assert.equal(f.counts().reloads, 1); await act(async () => tree.unmount());
});
test('a stalled cosmetic floor write cannot dispatch native reload beyond the original whole deadline', async () => {
  const f = fixture({ policy: 'ON_LOAD', stallFloorWrite: true }), tree = await mount(f);
  Object.assign(f.context, { isUpdatePending: true, downloadedManifest: { id: '22222222-2222-4222-8222-222222222222' } });
  await act(async () => { f.safeLinks(); f.resolveFont(); }); assert.equal(f.counts().reloads, 0);
  await act(async () => { f.setNow(12000); f.writeFloor.resolve(); }); assert.equal(f.counts().reloads, 0);
  await act(async () => tree.unmount());
});
test('real entry after font recovery records a running attempted candidate without reopening acquisition', async () => {
  const f = fixture({ runningCandidate: true }), tree = await mount(f);
  await act(async () => f.tick(5000)); await act(async () => f.resolveFont()); await act(async () => f.tick(5430));
  assert.equal(navigation(tree).length, 1); assert.equal(f.counts().checks, 0); assert.equal(f.counts().reloads, 0);
  assert.ok(f.writes.some(([key, value]) => key.startsWith('uulab.ota.') && JSON.parse(value).state === 'entered'));
  await act(async () => tree.unmount());
});
test('a skipped intermediate splash commit still hands native hiding to a readable navigation frame', async () => {
  const f = fixture({ checkNow: { isAvailable: false } }), tree = await mount(f);
  await act(async () => { f.safeLinks(); f.resolveFont(); for (let i = 0; i < 60; i++) await Promise.resolve(); f.tick(430); });
  assert.equal(navigation(tree).length, 1); assert.equal(f.counts().hides, 0);
  const frame = tree.root.findAllByType('View').find(view => typeof view.props.onLayout === 'function'); assert.ok(frame);
  await act(async () => frame.props.onLayout()); assert.equal(f.counts().hides, 1); await act(async () => tree.unmount());
});
test('queued initial lookup work cannot begin after the absolute 600ms cutoff', async () => {
  const f = fixture(); f.warmRuntime(); f.setNow(600);
  for (let i = 0; i < 20; i++) await Promise.resolve();
  assert.deepEqual(f.lookups(), { urlReads: 0, notificationReads: 0 });
  const tree = await mount(f); await act(async () => f.resolveFont()); assert.equal(f.counts().checks, 0);
  await act(async () => f.tick(1030)); assert.equal(navigation(tree).length, 1); await act(async () => tree.unmount());
});
test('repeated layouts cannot renew an exhausted native-hide budget in the same root mount', async () => {
  const f = fixture({ hideFailures: 99 }), tree = await mount(f); await act(async () => f.tick(5000));
  await act(async () => alert(tree).props.onLayout()); await act(async () => f.tick(5180)); await act(async () => f.tick(5360));
  assert.equal(f.counts().hides, 3);
  for (let i = 0; i < 9; i++) await act(async () => alert(tree).props.onLayout());
  assert.equal(f.counts().hides, 3); await act(async () => tree.unmount());
});
test('late font success does not wait for an expired pending cosmetic read when its timer is delayed', async () => {
  const f = fixture({ stallFloor: true }), tree = await mount(f); await act(async () => f.safeLinks());
  await act(async () => { f.setNow(4900); f.resolveFont(); }); assert.equal(f.counts().checks, 1);
  await act(async () => tree.unmount());
});
test('starting OTA preparation after the lookup cutoff settles uncertain lookups without waiting for delayed timers', async () => {
  const f = fixture(), tree = await mount(f);
  await act(async () => { f.setNow(4900); f.resolveFont(); }); assert.equal(f.counts().checks, 0);
  await act(async () => f.tick(5330)); assert.equal(navigation(tree).length, 1);
  await act(async () => tree.unmount());
});
