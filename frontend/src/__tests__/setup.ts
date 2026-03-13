import '@testing-library/jest-dom'

// Mock performance.now() for deterministic tests
if (typeof performance === 'undefined') {
  (globalThis as Record<string, unknown>).performance = { now: () => Date.now() }
}
