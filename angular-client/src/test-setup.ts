import { provideZonelessChangeDetection } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';
import { DATE_FORMATS } from 'src/utils/date-formats.utils';

// The unit-test builder's providersFile: these providers are registered on every TestBed, so specs
// mirror the real bootstrap in main.ts and need no per-spec wiring:
//   - provideZonelessChangeDetection: the app is zoneless, as in main.ts.
//   - ChipFaultPipe / native date adapter: provided at root in main.ts.
// ToastService, ConfirmService, MatDialog and MatSnackBar are providedIn: 'root'.
// Per-spec configureTestingModule calls still apply on top.
export default [provideZonelessChangeDetection(), ChipFaultPipe, provideNativeDateAdapter(DATE_FORMATS)];
