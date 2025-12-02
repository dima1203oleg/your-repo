import '@testing-library/jest-dom';

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia (only in environments that have window, e.g. jsdom)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

  // Mock getComputedStyle
  window.getComputedStyle = jest.fn().mockReturnValue({
  getPropertyValue: jest.fn(),
});

  // Mock localStorage
  const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock sessionStorage
  const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  });

// Mock performance API
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(),
  getEntriesByType: jest.fn(),
};

// Mock fetch
global.fetch = jest.fn();

  // Mock URL methods but don't overwrite the constructor — axios and other libs rely on
// `new URL()` being available. Only add the browser-specific helper functions if
// they don't exist.
/* eslint-disable @typescript-eslint/no-explicit-any */
const globalAny: any = global;
if (!globalAny.URL) {
  // In Node environments URL should exist; as a fallback import the Node URL
  // constructor so tests that rely on `new URL()` keep working.
  try {
    // eslint-disable-next-line global-require
    const { URL: NodeURL } = require('url');
    globalAny.URL = NodeURL;
  } catch (err) {
    // If import fails, create a minimal constructor so code using `new URL()`
    // doesn't crash during tests.
    // (Very few tests exercise full URL parsing — this is a safe fallback.)
    // eslint-disable-next-line @typescript-eslint/ban-types
    globalAny.URL = function (input: string) {
      return { href: String(input) };
    } as unknown as Function;
  }
  }

  if (typeof globalAny.URL.createObjectURL !== 'function') {
    globalAny.URL.createObjectURL = jest.fn();
  }
  if (typeof globalAny.URL.revokeObjectURL !== 'function') {
    globalAny.URL.revokeObjectURL = jest.fn();
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Mock canvas (only in environments that provide HTMLCanvasElement, e.g. jsdom)
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createImageData: jest.fn(),
  drawImage: jest.fn(),
  setTransform: jest.fn(),
  drawFocusIfNeeded: jest.fn(),
  createLinearGradient: jest.fn(),
  createRadialGradient: jest.fn(),
  createPattern: jest.fn(),
  beginPath: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  quadraticCurveTo: jest.fn(),
  bezierCurveTo: jest.fn(),
  rect: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  transform: jest.fn(),
  resetTransform: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  strokeText: jest.fn(),
});
}

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
    getRandomValues: jest.fn(() => new Uint32Array(1)),
  },
});

// Suppress console warnings in tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
