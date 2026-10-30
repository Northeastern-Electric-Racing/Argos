import { DialogService } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { providePrimeNG } from 'primeng/config';
import { provideRouter } from '@angular/router';
import { routes } from './app/app-routing.module';
import { provideZonelessChangeDetection } from '@angular/core';
import AppContextComponent from './app/context/app-context.component';
import ArgosPreset from './theme/argos-preset';

bootstrapApplication(AppContextComponent, {
  providers: [
    provideRouter(routes),
    DialogService,
    MessageService,
    ChipFaultPipe,
    provideHttpClient(withInterceptorsFromDi()),
    providePrimeNG({
      theme: {
        preset: ArgosPreset,
        options: {
          darkModeSelector: '.dark-mode-always'
        }
      }
    }),
    provideZonelessChangeDetection()
  ]
}).catch((err) => console.error(err));
