// jsdom polyfill pack per web-testing.md.
// Order matters — TextEncoder/TextDecoder MUST be on globalThis before undici imports.

import { TextEncoder, TextDecoder } from 'node:util';
import { webcrypto } from 'node:crypto';
import '@testing-library/jest-dom/vitest';

(globalThis as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
(globalThis as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder;

// fetch polyfill — Node's built-in fetch is not exposed inside jsdom.
import { fetch, Headers, Request, Response } from 'undici';
(globalThis as unknown as { fetch: typeof fetch }).fetch = fetch;
(globalThis as unknown as { Headers: typeof Headers }).Headers = Headers;
(globalThis as unknown as { Request: typeof Request }).Request = Request;
(globalThis as unknown as { Response: typeof Response }).Response = Response;

// Crypto — MSAL checks `this` is a real Crypto instance. Bind webcrypto directly.
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  writable: false,
  configurable: true,
});
if (!('randomUUID' in (globalThis.crypto as Crypto))) {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: () => webcrypto.randomUUID(),
    writable: false,
  });
}

// matchMedia + ResizeObserver — frequently missing in jsdom.
if (!('matchMedia' in window)) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

class ResizeObserverPolyfill {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverPolyfill }).ResizeObserver =
  ResizeObserverPolyfill;

class IntersectionObserverPolyfill {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
(
  globalThis as unknown as { IntersectionObserver: typeof IntersectionObserverPolyfill }
).IntersectionObserver = IntersectionObserverPolyfill;
