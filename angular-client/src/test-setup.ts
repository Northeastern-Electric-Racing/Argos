import 'vitest-canvas-mock';

// A `setupFiles` entry of the unit-test builder (angular.json). The builder initialises the
// Angular test environment itself, with the app-root providers from src/test-providers.ts, then
// runs this file before every spec file.

// Run every spec in the zone the team runs the client in, whatever the machine's (CI is UTC), so
// local-time tests such as the graph's DST ones behave the same everywhere. Set before any spec
// imports a module that builds an Intl.DateTimeFormat, which keeps the zone it was made in.
process.env['TZ'] = 'America/New_York';

// Jasmine removed every spy after each spec; Vitest keeps vi.spyOn spies until restored, and the
// builder runs spec files in one shared environment, so restore them here to keep specs isolated.
afterEach(() => {
  vi.restoreAllMocks();
});

// jsdom has no ResizeObserver, which Chart.js uses to follow its container's size.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};
