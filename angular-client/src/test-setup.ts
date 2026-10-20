import { provideZonelessChangeDetection } from '@angular/core';
import { provideTaiga } from '@taiga-ui/core';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';
import { ToastService } from 'src/services/toast.service';

// jsdom lacks browser APIs Taiga UI reads at startup (its docs ship the same mocks for Jest in
// @taiga-ui/jest-config, which assumes Jest + zone.js, so the few needed here are inlined).
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    }) as MediaQueryList;
}
for (const name of ['IntersectionObserver', 'ResizeObserver', 'MutationObserver'] as const) {
  if (!(name in window)) {
    Object.defineProperty(window, name, {
      value: class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      }
    });
  }
}

// The unit-test builder's providersFile: these providers are registered on every TestBed, so specs
// mirror the real bootstrap in main.ts and need no per-spec wiring:
//   - provideZonelessChangeDetection: the app is zoneless, as in main.ts.
//   - provideTaiga / ChipFaultPipe: provided at root in main.ts (Taiga's dialog and notification
//     services are providedIn: 'root').
//   - ToastService: a no-op, since toasts render into tui-root, which component tests don't mount
//     (PrimeNG's MessageService was likewise silent without a p-toast). Specs that assert on toasts
//     provide their own spy.
// Per-spec configureTestingModule calls still apply on top.
export default [
  provideZonelessChangeDetection(),
  provideTaiga({ mode: 'dark', scrollbars: 'native' }),
  ChipFaultPipe,
  { provide: ToastService, useValue: { show: () => {} } }
];
