import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideClientHydration, BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import Lara from '@primeng/themes/aura';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideRouter } from '@angular/router';
import { routes } from './app/app-routing.module';
import { importProvidersFrom, provideExperimentalZonelessChangeDetection } from '@angular/core';
import AppContextComponent from './app/context/app-context.component';

bootstrapApplication(AppContextComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(BrowserModule, DynamicDialogModule),
    DialogService,
    MessageService,
    ChipFaultPipe,
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          darkModeSelector: '.dark-mode-always'
        }
      }
    }),
    provideClientHydration(),
    provideExperimentalZonelessChangeDetection()
  ]
}).catch((err) => console.error(err));
