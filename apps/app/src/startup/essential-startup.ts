// UI readiness only. Essential fonts must succeed before ordinary app labels mount.
export type ResourceSnapshot = { status: 'pending' | 'recovery' | 'ready'; fontsReady: boolean; languageReady: boolean; reason?: string };
type Clock = { now: () => number; setTimeout: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>; clearTimeout: (timer: ReturnType<typeof setTimeout>) => void };
export function createEssentialFontLoader(load: () => Promise<void>) {
  let task: Promise<void> | undefined;
  let ready = false;
  return {
    prepare() {
      if (ready) return Promise.resolve();
      if (task) return task;
      try { task = Promise.resolve(load()); } catch (error) { task = Promise.reject(error); }
      const current = task;
      task = current.then(() => { ready = true; }, (error: unknown) => { task = undefined; throw error; });
      return task;
    },
  };
}
export function createEssentialStartupGate(fonts: ReturnType<typeof createEssentialFontLoader>, options: { deadlineMs: number; clock?: Clock }) {
  if (!Number.isFinite(options.deadlineMs) || options.deadlineMs <= 0) throw Error('Resources require a finite positive deadline.');
  const clock = options.clock ?? { now: () => performance.now(),
    setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
    clearTimeout: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
  };
  let snapshot: ResourceSnapshot = { status: 'pending', fontsReady: false, languageReady: false };
  let active = true, started = false;
  let expiresAt = Infinity;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<(state: ResourceSnapshot) => void>();
  function publish(next: Partial<ResourceSnapshot>) {
    if (!active) return;
    snapshot = { ...snapshot, ...next };
    if (snapshot.status === 'pending' && clock.now() >= expiresAt) snapshot = { ...snapshot, status: 'recovery', reason: 'resources-timeout' };
    if (snapshot.fontsReady && snapshot.languageReady) {
      snapshot = { ...snapshot, status: 'ready', reason: undefined };
      if (timer !== undefined) clock.clearTimeout(timer);
    }
    for (const listener of listeners) { try { listener(snapshot); } catch { /* Consumer error cannot strand readiness. */ } }
  }
  function wait() {
    if (!active || snapshot.status === 'ready') return;
    if (timer !== undefined) clock.clearTimeout(timer);
    expiresAt = clock.now() + options.deadlineMs;
    publish({ status: 'pending', reason: undefined });
    timer = clock.setTimeout(() => publish({ status: 'recovery', reason: 'resources-timeout' }), options.deadlineMs);
    // Retry shares the real load. A timeout never starts a duplicate font request.
    void fonts.prepare().then(() => publish({ fontsReady: true }), () => {
      if (timer !== undefined) clock.clearTimeout(timer);
      publish({ status: 'recovery', reason: 'fonts-failed' });
    });
  }
  return {
    start() { if (!started) { started = true; wait(); } },
    retry: wait,
    markLanguageReady() { publish({ languageReady: true }); },
    snapshot: () => snapshot,
    subscribe(listener: (state: ResourceSnapshot) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispose() { active = false; if (timer !== undefined) clock.clearTimeout(timer); listeners.clear(); },
  };
}
export function createNativeSplashHandoff(hide: () => Promise<void>, options: { retryMs?: number; clock?: Pick<Clock, 'setTimeout' | 'clearTimeout'> } = {}) {
  const retryMs = options.retryMs ?? 180;
  if (!Number.isFinite(retryMs) || retryMs <= 0) throw Error('Handoff retry requires a finite positive delay.');
  const clock = options.clock ?? {
    setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
    clearTimeout: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
  };
  let hidden = false, hiding = false, active = true, readableFrame = false, attempts = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  function cancelRetry() { if (retryTimer !== undefined) clock.clearTimeout(retryTimer); retryTimer = undefined; }
  function attempt() {
    if (!active || !readableFrame || hidden || hiding || attempts >= 3) return;
    hiding = true;
    attempts++;
    let task: Promise<void>;
    try { task = Promise.resolve(hide()); } catch { task = Promise.reject(); }
    void task.then(() => { hidden = true; }, () => undefined).finally(() => {
      hiding = false;
      // Retry transient native rejection after a proven readable frame. A
      // bounded three-attempt chain cannot rely on a second full-screen layout.
      if (active && !hidden && attempts < 3 && retryTimer === undefined) retryTimer = clock.setTimeout(() => { retryTimer = undefined; attempt(); }, retryMs);
    });
  }
  return {
    frameReady() {
      readableFrame = true;
      if (!active || hidden || hiding) return;
      cancelRetry();
      if (attempts >= 3) attempts = 0;
      attempt();
    },
    resume() { active = true; },
    dispose() { active = false; cancelRetry(); },
  };
}
