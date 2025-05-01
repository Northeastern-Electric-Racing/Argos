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
  id: string;
  label: string;
  onClick: () => void;
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

  mostUsedNavItems: NavItem[] = [
    { id: appRoutes.landingRoute(), label: 'Home', onClick: () => this.navigateTo(appRoutes.landingRoute()), icon: 'home' },
    {
      id: appRoutes.chargingRoute(),
      label: 'Charging',
      onClick: () => {
        this.navigateTo(appRoutes.chargingRoute());
      },
      icon: 'ev_station'
    },
    {
      id: appRoutes.graphRoute(),
      label: 'Graph',
      onClick: () => this.navigateTo(appRoutes.graphRoute()),
      icon: 'bar_chart'
    },
    // TODO: fix map
    // { label: 'Map', onClick: () => this.navigateTo(appRoutes.mapRoute()), icon: 'map' },
    { id: appRoutes.bmsRoute(), label: 'BMS', onClick: () => this.navigateTo(appRoutes.bmsRoute()), icon: 'action_key' },
    { id: appRoutes.faultsRoute(), label: 'Faults', onClick: () => this.navigateTo(appRoutes.faultsRoute()), icon: 'error' }
  ];

  onlyDesktopNavItems: NavItem[] = [
    ...this.mostUsedNavItems,
    { id: 'More Options', label: 'More Options', onClick: () => this.sidebarService.openSidebar(), icon: 'more_horiz' }
  ];

  allNavItems: NavItem[] = [
    ...this.mostUsedNavItems,
    {
      id: appRoutes.cameraRoute(),
      label: 'Camera',
      onClick: () => this.navigateTo(appRoutes.cameraRoute()),
      icon: 'linked_camera'
    },
    {
      id: appRoutes.commandsRoute(),
      label: 'Commands',
      onClick: () => this.navigateTo(appRoutes.commandsRoute()),
      icon: 'electrical_services'
    }
  ];

  navigateTo(route: string): void {
    this.selectedRoute = route;
    this.router.navigate([route]);
  }

  isSelected(navItem: NavItem) {
    return navItem.id === this.selectedRoute;
  }
}
