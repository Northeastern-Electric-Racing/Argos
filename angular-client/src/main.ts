import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app/app-routing.module';
import AppContextComponent from './app/context/app-context.component';

// UI services (ToastService, UiDialogService, ConfirmService) are providedIn: 'root'.
bootstrapApplication(AppContextComponent, {
  providers: [provideRouter(routes), ChipFaultPipe, provideHttpClient(withInterceptorsFromDi())]
}).catch((err) => console.error(err));
