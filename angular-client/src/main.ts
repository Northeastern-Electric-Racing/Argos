import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  provideClientHydration,
  BrowserModule,
  bootstrapApplication,
  withNoIncrementalHydration
} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app/app-routing.module';
import { importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { provideNzConfig } from 'ng-zorro-antd/core/config';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { NzModalService } from 'ng-zorro-antd/modal';
import { AccessibleModalService } from './services/accessible-modal.service';
import AppContextComponent from './app/context/app-context.component';
import { nzConfig } from './app/nz-config';
import { appIcons } from './app/nz-icons';

bootstrapApplication(AppContextComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(BrowserModule),
    // NzModalService isn't providedIn root, so one app-wide instance is provided here: ours, which adds
    // aria-modal, an accessible name and alertdialog for confirms to every nz-modal.
    { provide: NzModalService, useClass: AccessibleModalService },
    ChipFaultPipe,
    provideHttpClient(withInterceptorsFromDi()),
    provideNzConfig(nzConfig),
    provideNzI18n(en_US),
    // Weeks start on Sunday, as in the US locale (the adapter defaults to Monday without a date-fns locale).
    provideNzDateFnsAdapter({ firstDayOfWeek: 0 }),
    provideNzIcons(appIcons),
    provideClientHydration(withNoIncrementalHydration()),
    provideZonelessChangeDetection()
  ]
}).catch((err) => console.error(err));
