import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { ChipFaultPipe } from 'src/utils/pipes/chip-fault.pipe';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideClientHydration, BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import Lara from '@primeng/themes/aura';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { AppRoutingModule } from './app/app-routing.module';
import { CarouselModule } from 'primeng/carousel';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ToastModule } from 'primeng/toast';
import { OrderListModule } from 'primeng/orderlist';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { ButtonModule } from 'primeng/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { SidebarModule } from 'primeng/sidebar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SelectModule } from 'primeng/select';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { TreeModule } from 'primeng/tree';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { PasswordModule } from 'primeng/password';
import { importProvidersFrom, provideExperimentalZonelessChangeDetection } from '@angular/core';
import AppContextComponent from './app/context/app-context.component';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AutoCompleteModule } from 'primeng/autocomplete';

bootstrapApplication(AppContextComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      AppRoutingModule,
      CarouselModule,
      NgApexchartsModule,
      NgApexchartsModule,
      ToastModule,
      OrderListModule,
      ProgressSpinnerModule,
      MatIconModule,
      MatGridListModule,
      DynamicDialogModule,
      ButtonModule,
      MatToolbarModule,
      MatButtonModule,
      MatInputModule,
      ReactiveFormsModule,
      MatCardModule,
      MatDividerModule,
      SidebarModule,
      MatSelectModule,
      MatFormFieldModule,
      FormsModule,
      SelectModule,
      AccordionModule,
      TableModule,
      TreeModule,
      InputTextModule,
      InputNumberModule,
      PasswordModule,
      ToggleSwitchModule,
      AutoCompleteModule
    ),
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
