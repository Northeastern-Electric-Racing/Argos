import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';

// A `setupFiles` entry of the unit-test builder (angular.json). The builder initialises the
// Angular test environment itself, then runs this file before every spec file.

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
  // Unit tests never reach the network: a component that fetches on init (e.g. the run list) would
  // otherwise send a real request, and its late rejection lands in whichever spec runs next. Keep
  // fetch pending, as an unanswered request; a spec that needs data mocks its src/api function.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {}))
  );
});

// Jasmine removed every spy after each spec; Vitest keeps vi.spyOn spies until restored, and the
// builder runs spec files in one shared environment, so restore them here to keep specs isolated.
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // localStorage is shared by every spec file in the run; clear it so presets saved by one spec
  // don't change what the next one loads.
  localStorage.clear();
});
