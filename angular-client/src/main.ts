import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  provideClientHydration,
  BrowserModule,
  bootstrapApplication,
  withNoIncrementalHydration
} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { routes } from './app/app-routing.module';
import { importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import AppContextComponent from './app/context/app-context.component';

bootstrapApplication(AppContextComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(BrowserModule),
    ChipFaultPipe,
    provideHttpClient(withInterceptorsFromDi()),
    // Keeps CDK overlays (dialogs, sheets, popovers) layered above the Sonner toaster.
    provideSpartanHlm(),
    provideClientHydration(withNoIncrementalHydration()),
    provideZonelessChangeDetection()
  ]
}).catch((err) => console.error(err));
