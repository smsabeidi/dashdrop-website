/** Mirrored HubSpot / template globals (loaded at runtime). */
declare global {
  interface Window {
    Splide: new (
      selector: string,
      options: Record<string, unknown>,
    ) => { mount: (...args: unknown[]) => unknown };
    splide?: { Extensions?: unknown };
    jQuery?: unknown;
    $?: unknown;
    hsVars?: Record<string, unknown>;
    OneTrust?: { ToggleInfoDisplay: () => void };
  }
}

export {};
