import 'vitest-canvas-mock';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';

// A `setupFiles` entry of the unit-test builder (angular.json). The builder initialises the
// Angular test environment itself, then runs this file before every spec file.

// Run every spec in the zone the team runs the client in, whatever the machine's (CI is UTC), so
// local-time tests such as the graph's DST ones behave the same everywhere. Set before any spec
// imports a module that builds an Intl.DateTimeFormat, which keeps the zone it was made in.
process.env['TZ'] = 'America/New_York';

// Register globally the app-root providers that every component implicitly relies on, so specs
// mirror the real bootstrap in main.ts and need no per-spec wiring:
//   - provideZonelessChangeDetection: the app is zoneless, as in main.ts.
//   - MessageService / DialogService / ChipFaultPipe: provided at root in main.ts.
// This root-level beforeEach runs after the builder's TestBed reset and before each spec's own
// beforeEach, and configureTestingModule accumulates providers, so per-spec configuration still
// applies on top.
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), MessageService, DialogService, ChipFaultPipe]
  });
});

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
