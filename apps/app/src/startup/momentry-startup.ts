import { createEssentialFontLoader, createEssentialStartupGate } from './essential-startup';
import { createStartupGate, type StartupAdapter, type StartupOptions } from './startup-ota';

export type MomentryStartupState = {
  phase: 'loading' | 'recovery' | 'ready';
  fontsReady: boolean;
  progress: number;
  message: string;
  retrying: boolean;
};
type Services = {
  loadFonts: () => Promise<void>;
  restoreFloor: (expiresAt: number, current: () => boolean) => Promise<number | null>;
  clearFloor: (expiresAt: number, current: () => boolean) => Promise<void>;
  saveFloor: (expiresAt: number, current: () => boolean) => Promise<void>;
};

// Resources belong to the runtime; each React mount only subscribes to them.
// Recovery, disposal, backgrounding and entry permanently seal update acquisition.
export function createMomentryStartup(adapter: StartupAdapter, services: Services, options: StartupOptions & { otaMs: number; fontMs: number; finishMs: number }) {
  if ([options.deadlineMs, options.otaMs, options.fontMs].some(value => !Number.isFinite(value) || value <= 0) ||
      !Number.isFinite(options.finishMs) || options.finishMs < 0 || options.otaMs > options.deadlineMs) throw Error('Momentry startup budgets must be finite and nested.');
  const clock = options.clock ?? { now: () => performance.now(), setTimeout, clearTimeout };
  const fonts = createEssentialFontLoader(services.loadFonts);
  let gate: ReturnType<typeof createStartupGate> | undefined;
  let sealed = false, entered = false, began = false, expiresAt = Infinity;
  let ownerCurrent: (() => boolean) | undefined;
  function closeOta(reason: 'background' | 'unmount' | 'entry') { sealed = true; gate?.close(reason); }
  function mount() {
    let mounted = true, started = false, completing = false, resourceUntil = Infinity;
    let state: MomentryStartupState = { phase: 'loading', fontsReady: false, progress: 0.06, message: '기억을 꺼낼 준비를 하고 있어요', retrying: false };
    let timer: ReturnType<typeof setTimeout> | undefined, completionTimer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribeGate: (() => void) | undefined;
    let floorTask: Promise<unknown> = Promise.resolve(), floorUntil = Infinity;
    const listeners = new Set<(value: MomentryStartupState) => void>();
    function publish(next: Partial<MomentryStartupState>) {
      if (!mounted) return;
      state = { ...state, ...next, progress: Math.max(state.progress, next.progress ?? state.progress) };
      listeners.forEach(listener => { try { listener(state); } catch { /* Rendering cannot strand startup. */ } });
    }
    function finish() {
      if (!mounted || !state.fontsReady || state.phase === 'ready') return;
      closeOta('entry');
      if (timer !== undefined) clock.clearTimeout(timer);
      if (completionTimer !== undefined) clock.clearTimeout(completionTimer);
      publish({ phase: 'ready', progress: 1, message: '준비가 끝났어요', retrying: false });
    }
    function current() { return mounted && state.phase !== 'ready' && clock.now() < expiresAt; }
    function elapsed() {
      closeOta('entry');
      if (state.fontsReady) finish();
      else publish({ phase: 'recovery', retrying: false });
    }
    async function bounded<T>(request: Promise<T>, until: number): Promise<T | undefined> {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const value = await Promise.race([request.catch(() => undefined), new Promise<undefined>(done => {
          timeout = clock.setTimeout(() => done(undefined), Math.max(0, until - clock.now()));
        })]);
        return clock.now() < until && mounted ? value : undefined;
      } finally { if (timeout !== undefined) clock.clearTimeout(timeout); }
    }
    async function complete() {
      if (!mounted || !state.fontsReady || completing || state.phase === 'ready') return;
      completing = true;
      try {
        // An optional native read may still be pending after its timer's due
        // time. A late resource continuation must not wait on expired work.
        if (clock.now() < floorUntil) await floorTask;
        if (!mounted) return;
        if (clock.now() >= expiresAt) { elapsed(); return; }
        if (!sealed && !entered && !gate) {
          ownerCurrent = () => current() && state.fontsReady;
          const otaUntil = Math.min(expiresAt, clock.now() + options.otaMs);
          const acquisitionCurrent = () => !sealed && !entered && clock.now() < otaUntil && Boolean(ownerCurrent?.()) && adapter.canReload();
          gate = createStartupGate({ ...adapter, canReload: acquisitionCurrent,
            storage: { ...adapter.storage, set: async (key, value) => {
              await adapter.storage.set(key, value);
              // Cosmetic progress is saved before the shared controller's final
              // native/candidate revalidation. It is never a success ledger.
              if (JSON.parse(value).state === 'attempted' && acquisitionCurrent()) {
                const until = Math.min(otaUntil, expiresAt, clock.now() + 400);
                await bounded(Promise.resolve().then(() => acquisitionCurrent() && clock.now() < until ? services.saveFloor(until, acquisitionCurrent) : undefined), until);
              }
            } },
          }, {
            deadlineMs: Math.max(1, otaUntil - clock.now()), clock,
          });
        }
        unsubscribeGate = gate?.subscribe(update => {
          if (!current() || update.phase === 'ready') return;
          publish({ progress: update.progress, message: update.phase === 'applying' || update.phase === 'downloading'
            ? '업데이트를 적용하고 있어요' : update.phase === 'checking' ? '최신 업데이트를 확인하고 있어요' : state.message });
        });
        await gate?.start();
        if (!mounted) return;
        if (clock.now() >= expiresAt) { elapsed(); return; }
        closeOta('entry');
        const clearUntil = Math.min(expiresAt, clock.now() + 400);
        await bounded(Promise.resolve().then(() => current() && clock.now() < clearUntil ? services.clearFloor(clearUntil, current) : undefined), clearUntil);
        if (!mounted) return;
        if (clock.now() >= expiresAt) { elapsed(); return; }
        publish({ progress: 1, message: '준비가 끝났어요', retrying: false });
        completionTimer = clock.setTimeout(finish, Math.min(options.finishMs, expiresAt - clock.now()));
      } finally { unsubscribeGate?.(); }
    }
    const resources = createEssentialStartupGate(fonts, { deadlineMs: options.fontMs, clock });
    const unsubscribeResources = resources.subscribe(value => {
      if (!mounted) return;
      if (value.status === 'recovery' || clock.now() >= resourceUntil) closeOta('entry');
      if (value.status === 'ready') {
        publish({ fontsReady: true, phase: 'loading', retrying: false });
        void complete();
      } else if (value.status === 'recovery') publish({ phase: 'recovery', retrying: false });
    });
    return {
      snapshot: () => state,
      subscribe(listener: (value: MomentryStartupState) => void) { listeners.add(listener); listener(state); return () => { listeners.delete(listener); }; },
      start() {
        if (started || !mounted) return;
        started = true;
        if (!began) { began = true; expiresAt = clock.now() + options.deadlineMs; }
        resourceUntil = clock.now() + options.fontMs;
        timer = clock.setTimeout(elapsed, Math.max(0, expiresAt - clock.now()));
        floorUntil = Math.min(expiresAt, clock.now() + 400);
        floorTask = bounded(Promise.resolve().then(() => current() && clock.now() < floorUntil ? services.restoreFloor(floorUntil, current) : null), floorUntil)
          .then(floor => { if (current() && typeof floor === 'number' && Number.isFinite(floor)) publish({ progress: Math.min(Math.max(floor, 0), 0.94) }); });
        resources.start();
        // Momentry's fixed Korean copy has no asynchronous language provider.
        resources.markLanguageReady();
      },
      retry() {
        if (!mounted || state.phase !== 'recovery' || state.retrying) return;
        closeOta('entry'); resourceUntil = clock.now() + options.fontMs;
        publish({ retrying: true }); resources.retry();
      },
      close(reason: 'background' | 'unmount' | 'entry') {
        closeOta(reason);
        if (reason === 'unmount') {
          mounted = false; resources.dispose(); unsubscribeResources(); unsubscribeGate?.(); listeners.clear();
          if (timer !== undefined) clock.clearTimeout(timer);
          if (completionTimer !== undefined) clock.clearTimeout(completionTimer);
        }
      },
    };
  }
  return { mount, closeOta, observeNative: () => gate?.observeNative(), markAppEntered() {
    entered = true; closeOta('entry');
    // Resource recovery can seal acquisition before a controller is needed.
    // Real entry still records the actually running candidate's prior attempt.
    if (!gate) gate = createStartupGate({ ...adapter, canReload: () => false }, { deadlineMs: options.otaMs, clock });
    void gate.markAppEntered();
  } };
}
