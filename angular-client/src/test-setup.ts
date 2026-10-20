import { importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { provideNzConfig } from 'ng-zorro-antd/core/config';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';
import { nzConfig } from './app/nz-config';
import { appIcons } from './app/nz-icons';

// The unit-test builder's providersFile: these providers are registered on every TestBed, so specs
// mirror the real bootstrap in main.ts and need no per-spec wiring:
//   - provideZonelessChangeDetection: the app is zoneless, as in main.ts.
//   - ng-zorro config, i18n, date adapter, icons and NzModalService: as in main.ts
//     (NzNotificationService is providedIn root).
//   - ChipFaultPipe: provided at root in main.ts.
// Per-spec configureTestingModule calls still apply on top.
export default [
  provideZonelessChangeDetection(),
  provideNzConfig(nzConfig),
  provideNzI18n(en_US),
  provideNzDateFnsAdapter(),
  provideNzIcons(appIcons),
  importProvidersFrom(NzModalModule),
  ChipFaultPipe
];
