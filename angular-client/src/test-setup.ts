import { provideZonelessChangeDetection } from '@angular/core';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';

// The unit-test builder's providersFile: these providers are registered on every TestBed, so specs
// mirror the real bootstrap in main.ts and need no per-spec wiring:
//   - provideZonelessChangeDetection: the app is zoneless, as in main.ts.
//   - ChipFaultPipe: provided at root in main.ts. The UI services are providedIn: 'root'.
// Per-spec configureTestingModule calls still apply on top.
export default [provideZonelessChangeDetection(), ChipFaultPipe];
