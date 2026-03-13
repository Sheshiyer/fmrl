import '@testing-library/jest-dom'

// Mock performance.now() for deterministic tests
if (typeof performance === 'undefined') {
  global.performance = { now: () => Date.now() } as Performance
}
