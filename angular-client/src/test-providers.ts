import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';

// The unit-test builder's providersFile (angular.json): these providers are registered on every
// TestBed, so specs mirror the real bootstrap in main.ts and need no per-spec wiring:
//   - ChipFaultPipe: provided at root in main.ts. The UI services are providedIn: 'root'.
// Zoneless change detection is Angular's default for both bootstrapApplication and TestBed, so it
// isn't listed. Per-spec configureTestingModule calls still apply on top.
export default [ChipFaultPipe];
