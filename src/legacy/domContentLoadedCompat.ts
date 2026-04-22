type QueuedListener = {
  target: EventTarget;
  listener: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
};

const origAddEventListener = EventTarget.prototype.addEventListener;

/**
 * Best-effort `Event` shape for legacy handlers that read `event.target` / `currentTarget`.
 * DOMContentLoaded uses `Document` as target per HTML spec; `window` listeners also receive it.
 */
function createDomContentLoadedEvent(forTarget: EventTarget): Event {
  const ev = new Event("DOMContentLoaded", {
    bubbles: true,
    cancelable: true,
  });
  const doc = typeof document !== "undefined" ? document : null;
  const primaryTarget: EventTarget = doc ?? forTarget;
  try {
    Object.defineProperty(ev, "target", {
      configurable: true,
      get: () => primaryTarget,
    });
    Object.defineProperty(ev, "currentTarget", {
      configurable: true,
      get: () => forTarget,
    });
  } catch {
    /* ignore in odd environments */
  }
  return ev;
}

/**
 * During legacy manifest replay, `document.readyState` is typically `interactive` or
 * `complete`, so real `DOMContentLoaded` never fires. Patch `addEventListener` for
 * `document` / `window` + `DOMContentLoaded`, queue callbacks, then flush once after
 * the manifest runner completes (mirrors: inline body scripts registered, then DCL
 * after synchronous script queue on static parse — here: after the full async replay
 * of this manifest, which is the closest CSR-safe point without inserting scripts
 * into the live document parse stream).
 */
export async function withDomContentLoadedReplayCompat<T>(
  run: () => Promise<T>,
): Promise<T> {
  const queue: QueuedListener[] = [];
  const doc = typeof document !== "undefined" ? document : undefined;
  const win = typeof window !== "undefined" ? window : undefined;

  function patched(
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void {
    const late = doc !== undefined && document.readyState !== "loading";
    const relevantTarget =
      doc !== undefined && win !== undefined && (this === doc || this === win);

    if (type === "DOMContentLoaded" && late && relevantTarget && listener != null) {
      queue.push({ target: this, listener, options });
      return;
    }

    return origAddEventListener.call(
      this,
      type,
      listener as EventListener,
      options as AddEventListenerOptions | undefined,
    );
  }

  EventTarget.prototype.addEventListener = patched as typeof origAddEventListener;

  const flush = () => {
    if (queue.length === 0) return;
    for (const q of queue) {
      const ev = createDomContentLoadedEvent(q.target);
      try {
        if (typeof q.listener === "function") {
          q.listener.call(q.target, ev);
        } else if (
          typeof q.listener === "object" &&
          q.listener !== null &&
          "handleEvent" in q.listener &&
          typeof q.listener.handleEvent === "function"
        ) {
          q.listener.handleEvent.call(q.listener, ev);
        }
      } catch (e) {
        console.warn("DOMContentLoaded compat listener failed", e);
      }
    }
    queue.length = 0;
  };

  try {
    return await run();
  } finally {
    EventTarget.prototype.addEventListener = origAddEventListener;
    /**
     * Defer to the next microtask so any synchronous inline in `run` has finished
     * before we invoke queued DCL handlers (closer to “after the current turn”).
     */
    queueMicrotask(flush);
  }
}
