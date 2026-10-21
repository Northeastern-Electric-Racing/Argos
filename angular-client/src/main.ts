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
import { provideTaiga } from '@taiga-ui/core';
import AppContextComponent from './app/context/app-context.component';

bootstrapApplication(AppContextComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(BrowserModule),
    ChipFaultPipe,
    provideHttpClient(withInterceptorsFromDi()),
    // Argos is a dark-only dashboard, so pin Taiga's dark mode instead of following the OS theme;
    // native scrollbars, since the app hides page scrollbars (styles.css)
    provideTaiga({ mode: 'dark', scrollbars: 'native' }),
    provideClientHydration(withNoIncrementalHydration()),
    provideZonelessChangeDetection()
  ]
}).catch((err) => console.error(err));
