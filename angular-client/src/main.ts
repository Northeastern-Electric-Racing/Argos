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
import { NzModalModule } from 'ng-zorro-antd/modal';
import AppContextComponent from './app/context/app-context.component';
import { nzConfig } from './app/nz-config';
import { appIcons } from './app/nz-icons';

bootstrapApplication(AppContextComponent, {
  providers: [
    provideRouter(routes),
    // NzModalService isn't providedIn root, so one app-wide instance is provided here.
    importProvidersFrom(BrowserModule, NzModalModule),
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
