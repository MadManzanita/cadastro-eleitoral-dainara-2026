// Read-only refreshes: never retry writes or overlap slow requests.
export function startLiveRefresh({ read, apply, onError, isReady, target = window, page = document, delay = 15000 }) {
  let stopped = false;
  let pending = false;
  let failures = 0;
  let timer;
  let controller;
  const refresh = async () => {
    if (stopped || pending || page.visibilityState !== "visible" || target.navigator.onLine === false) return;
    target.clearTimeout(timer);
    if (!isReady()) { timer = target.setTimeout(refresh, delay); return; }
    pending = true;
    controller = new AbortController();
    const timeout = target.setTimeout(() => controller.abort(), 20000);
    try {
      const value = await read(controller.signal);
      if (!stopped) { apply(value); failures = 0; }
    } catch (error) {
      if (!stopped) { failures++; onError(error); }
    } finally {
      target.clearTimeout(timeout);
      pending = false;
      if (!stopped) timer = target.setTimeout(refresh, Math.min(delay * 2 ** failures, 120000));
    }
  };
  const resume = () => {
    if (stopped || pending) return;
    target.clearTimeout(timer);
    timer = target.setTimeout(refresh, delay);
    void refresh();
  };
  timer = target.setTimeout(resume, delay);
  target.addEventListener("focus", resume);
  target.addEventListener("online", resume);
  page.addEventListener("visibilitychange", resume);
  return () => {
    stopped = true;
    target.clearTimeout(timer);
    controller?.abort();
    target.removeEventListener("focus", resume);
    target.removeEventListener("online", resume);
    page.removeEventListener("visibilitychange", resume);
  };
}
