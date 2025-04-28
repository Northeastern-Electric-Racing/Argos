import { Component, HostListener, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { interval, map, Observable, startWith } from 'rxjs';
import { startNewRun } from 'src/api/run.api';
import { RunFormComponent } from 'src/components/run-form/run-form.component';
import APIService from 'src/services/api.service';
import SidebarService from 'src/services/sidebar.service';
import { appRoutes } from '../app-routing.module';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-nav-bar',
  templateUrl: './app-nav-bar.component.html',
  styleUrls: ['./app-nav-bar.component.css']
})
export class AppNavBarComponent implements OnInit {
  private serverService = inject(APIService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private sidebarService = inject(SidebarService);
  private dialogService = inject(DialogService);

  ref: DynamicDialogRef | undefined;

  // Set selected route to current URL path
  selectedRoute: string = window.location.pathname;
  sidebarVisible = false;
  isMobile = false;

  ngOnInit(): void {
    this.sidebarService.isOpen.subscribe((isOpen) => {
      this.sidebarVisible = isOpen;
    });
    this.selectedRoute = window.location.pathname;
    this.isMobile = window.innerWidth <= 768;
  }

  // on resize, set the screen width
  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.isMobile = window.innerWidth <= 768;
  }
  newRunIsLoading = false;
  time$: Observable<Date> = interval(1000).pipe(
    startWith(0),
    map(() => new Date())
  );

  onStartNewRun = () => {
    const runsQueryResponse = this.serverService.query(() => startNewRun(), { invalidates: ['runs'] });
    runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.newRunIsLoading = isLoading;
    });
    runsQueryResponse.error.subscribe((error) => {
      error && this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    });
  };

  openRunForm = () => {
    this.ref = this.dialogService.open(RunFormComponent, {
      width: '550px',
      header: 'Edit Run',
      closable: true,
      closeAriaLabel: 'Close'
    });
  };

  navItems: NavItem[] = [
    { label: 'Home', route: appRoutes.landingRoute(), icon: 'home' },
    { label: 'Charging', route: appRoutes.chargingRoute(), icon: 'ev_station' },
    { label: 'Graph', route: appRoutes.graphRoute(), icon: 'bar_chart' },
    // TODO: fix map
    // { label: 'Map', route: appRoutes.mapRoute(), icon: 'map' },
    { label: 'BMS', route: appRoutes.bmsRoute(), icon: 'action_key' },
    { label: 'Faults', route: appRoutes.faultsRoute(), icon: 'error' },
    { label: 'Camera', route: appRoutes.cameraRoute(), icon: 'linked_camera' }
  ];

  navigateTo(route: string): void {
    this.selectedRoute = route;
    this.router.navigate([route]);
  }
}
