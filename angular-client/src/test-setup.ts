import { provideZonelessChangeDetection } from '@angular/core';
import { provideNzConfig } from 'ng-zorro-antd/core/config';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { NzModalService } from 'ng-zorro-antd/modal';
import { AccessibleModalService } from './services/accessible-modal.service';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';
import { nzConfig } from './app/nz-config';
import { appIcons } from './app/nz-icons';

// The unit-test builder's providersFile: these providers are registered on every TestBed, so specs
// mirror the real bootstrap in main.ts and need no per-spec wiring:
//   - provideZonelessChangeDetection: the app is zoneless, as in main.ts.
//   - ng-zorro config, i18n, date adapter, icons and NzModalService (as AccessibleModalService): as in main.ts
//     (NzNotificationService is providedIn root; the app shows toasts through NotificationAnnouncerService).
//   - ChipFaultPipe: provided at root in main.ts.
// Per-spec configureTestingModule calls still apply on top.
export default [
  provideZonelessChangeDetection(),
  provideNzConfig(nzConfig),
  provideNzI18n(en_US),
  provideNzDateFnsAdapter({ firstDayOfWeek: 0 }),
  provideNzIcons(appIcons),
  { provide: NzModalService, useClass: AccessibleModalService },
  ChipFaultPipe
];
