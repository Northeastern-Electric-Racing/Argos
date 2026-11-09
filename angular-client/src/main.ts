import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app/app-routing.module';
import { importProvidersFrom } from '@angular/core';
import AppContextComponent from './app/context/app-context.component';

// UI services (ToastService, UiDialogService, ConfirmService) are providedIn: 'root'.
bootstrapApplication(AppContextComponent, {
  providers: [
    provideRouter(routes),
    importProvidersFrom(BrowserModule),
    ChipFaultPipe,
    provideHttpClient(withInterceptorsFromDi())
  ]
}).catch((err) => console.error(err));
