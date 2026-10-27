import { provideZonelessChangeDetection } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';

// The unit-test builder's providersFile: these providers are registered on every TestBed, so specs
// mirror the real bootstrap in main.ts and need no per-spec wiring:
//   - provideZonelessChangeDetection: the app is zoneless, as in main.ts.
//   - MessageService / DialogService / ChipFaultPipe: provided at root in main.ts.
// Per-spec configureTestingModule calls still apply on top.
export default [provideZonelessChangeDetection(), MessageService, DialogService, ChipFaultPipe];
