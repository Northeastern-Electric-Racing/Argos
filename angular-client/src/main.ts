import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  provideClientHydration,
  BrowserModule,
  bootstrapApplication,
  withNoIncrementalHydration
} from '@angular/platform-browser';
import Lara from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { provideRouter } from '@angular/router';
import { routes } from './app/app-routing.module';
import { importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import AppContextComponent from './app/context/app-context.component';

bootstrapApplication(AppContextComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(BrowserModule, DynamicDialogModule),
    DialogService,
    MessageService,
    ChipFaultPipe,
    provideHttpClient(withInterceptorsFromDi()),
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          darkModeSelector: '.dark-mode-always'
        }
      }
    }),
    provideClientHydration(withNoIncrementalHydration()),
    provideZonelessChangeDetection()
  ]
}).catch((err) => console.error(err));
