// ─── PENDING FEATURES ─────────────────────────────────────────────────────────
// This app has NO mock mode. Every API client either calls a real backend
// endpoint or throws from here.
//
// A frontend feature whose backend module does not exist yet must fail
// loudly and visibly. It must never return fabricated data, and it must
// never report success for an operation that did not happen — in a banking
// product a silent lie is worse than a visible gap.
//
// See docs/API-CONTRACT.md for the full LIVE vs PENDING mapping.

/**
 * Thrown by every frontend method whose backend endpoint is not built.
 * Screens detect it via `err.isPending` and render <PendingFeature />.
 */
export class FeatureNotAvailableError extends Error {
  constructor(module, endpoint) {
    super(`The ${module} module is not available yet.`);
    this.name = 'FeatureNotAvailableError';
    this.isPending = true;
    this.module = module;
    this.endpoint = endpoint;
  }
}

/**
 * Builds an API method that always rejects with FeatureNotAvailableError.
 *
 * @param {string} module   Backend module that must be built, e.g. 'ledger'
 * @param {string} endpoint The endpoint the UI was written against — kept so
 *                          the intended contract stays documented in code.
 */
export function pendingEndpoint(module, endpoint) {
  return async () => {
    throw new FeatureNotAvailableError(module, endpoint);
  };
}

/** True when an error came from an unbuilt backend module. */
export function isPendingError(error) {
  return Boolean(error?.isPending);
}
