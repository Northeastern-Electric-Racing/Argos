import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';

// Supplying `main` in angular.json replaces the builder's auto-generated test entry, so we must
// initialise the test environment ourselves (the auto entry used to do this).
getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

// Register globally the app-root providers that every component implicitly relies on, so specs
// mirror the real bootstrap in main.ts and need no per-spec wiring:
//   - provideExperimentalZonelessChangeDetection: the app is zoneless; without it component
//     TestBeds throw NG0908 ("Angular requires Zone.js").
//   - MessageService / DialogService / ChipFaultPipe: provided at root in main.ts.
// This root-level beforeEach runs before each spec's own beforeEach, and configureTestingModule
// accumulates providers, so per-spec configuration still applies on top.
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideExperimentalZonelessChangeDetection(), MessageService, DialogService, ChipFaultPipe]
  });
});
