import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MessageService, PrimeTemplate } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { interval, map, Observable, startWith, Subscription } from 'rxjs';
import { startNewRun } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import SidebarService from 'src/services/sidebar.service';
import { appRoutes } from '../app-routing.module';
import { Sidebar } from 'primeng/sidebar';
import { CurrentRunDisplayComponent } from '../../pages/landing-page/components/current-run-display/current-run-display.component';
import { ToastButtonComponent } from '../../components/toast-button/toast-button.component';
import { MessagesPerSecondComponent } from '../../components/messages-per-second/messages-per-second.component';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import SidebarChipComponent from 'src/components/sidebar-chip/sidebar-chip.component';
import { NavOptionsMenuComponent } from 'src/components/nav-options-menu/nav-options-menu.component';
import { filter } from 'rxjs/operators';
import { RunFormComponent } from 'src/components/run-form/run-form.component';

export interface NavItem {
  id: string;
  label: string;
  onClick: () => void;
  icon: string;
}

@Component({
  selector: 'app-nav-bar',
  templateUrl: './app-nav-bar.component.html',
  styleUrls: ['./app-nav-bar.component.css'],
  standalone: true,
  imports: [
    Sidebar,
    PrimeTemplate,
    CurrentRunDisplayComponent,
    ToastButtonComponent,
    MessagesPerSecondComponent,
    AsyncPipe,
    DatePipe,
    TypographyComponent,
    HStackComponent,
    SidebarChipComponent,
    MatIcon
  ]
})
export class AppNavBarComponent implements OnInit, OnDestroy {
  private serverService = inject(APIService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private sidebarService = inject(SidebarService);
  private dialogService = inject(DialogService);
  private subscribtions: Subscription[] = [];

  ref: DynamicDialogRef | undefined;
  menuRef: DynamicDialogRef | undefined;
  editRunRef: DynamicDialogRef | undefined;

  // Set selected route to current URL path
  selectedRoute: string = window.location.pathname;
  sidebarVisible = false;
  isMobile = false;
  isWindowSmall = window.innerWidth <= 1160 && !this.isMobile;

  ngOnInit(): void {
    this.subscribtions.push(
      this.sidebarService.isOpen.subscribe((isOpen) => {
        this.sidebarVisible = isOpen;
      })
    );
    this.isMobile = window.innerWidth <= 768;
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      this.selectedRoute = event.url;
    });
  }

  ngOnDestroy(): void {
    this.subscribtions.forEach((sub) => {
      sub.unsubscribe();
    });
    if (this.menuRef) {
      this.menuRef.close();
    }
  }

  // on resize, set the screen width
  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.isMobile = window.innerWidth <= 768;
    this.isWindowSmall = window.innerWidth <= 1160 && !this.isMobile;
  }

  newRunIsLoading = false;
  time$: Observable<Date> = interval(1000).pipe(
    startWith(0),
    map(() => new Date())
  );

  onStartNewRun = () => {
    const runsQueryResponse = this.serverService.query(() => startNewRun(), { invalidates: ['runs'] });
    this.subscribtions.push(
      runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
        this.newRunIsLoading = isLoading;
      })
    );
    this.subscribtions.push(
      runsQueryResponse.error.subscribe((error) => {
        error && this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
      })
    );
  };

  openRunForm = () => {
    this.editRunRef = this.dialogService.open(RunFormComponent, {
      width: '550px',
      header: 'Edit Run',
      closable: true,
      closeAriaLabel: 'Close'
    });
  };

  homeNavItem: NavItem = {
    id: appRoutes.landingRoute(),
    label: 'Home',
    onClick: () => this.navigateTo(appRoutes.landingRoute()),
    icon: 'logo'
  };

  mostUsedNavItems: NavItem[] = [
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
    { id: appRoutes.faultsRoute(), label: 'Fault', onClick: () => this.navigateTo(appRoutes.faultsRoute()), icon: 'error' },
    { id: appRoutes.bmsRoute(), label: 'BMS', onClick: () => this.navigateTo(appRoutes.bmsRoute()), icon: 'action_key' }
  ];

  onlyDesktopNavItems: NavItem[] = [...this.mostUsedNavItems];

  toggleMenu() {
    if (this.menuRef) {
      this.menuRef.close();
      this.menuRef = undefined;
    } else {
      this.openMenu();
    }
  }

  allNavItems: NavItem[] = [this.homeNavItem, ...this.mostUsedNavItems];
  navMenuItems: NavItem[] = [
    {
      id: appRoutes.mapRoute(),
      label: 'Map',
      onClick: () => this.navigateTo(appRoutes.mapRoute()),
      icon: 'map'
    },
    {
      id: appRoutes.cameraRoute(),
      label: 'Camera',
      onClick: () => this.navigateTo(appRoutes.cameraRoute()),
      icon: 'linked_camera'
    },
    {
      id: '',
      label: 'Edit Runs',
      onClick: this.openRunForm,
      icon: 'edit'
    },
    {
      id: appRoutes.commandsRoute(),
      label: 'Commands',
      onClick: () => this.navigateTo(appRoutes.commandsRoute()),
      icon: 'electrical_services'
    }
  ];

  openMenu() {
    this.menuRef = this.dialogService.open(NavOptionsMenuComponent, {
      showHeader: false,
      modal: true,
      dismissableMask: true,
      styleClass: 'nav-options-dialog',
      baseZIndex: 10000,
      width: 'auto',
      data: {
        items: this.navMenuItems
      }
    });

    this.menuRef.onClose.subscribe(() => {
      this.menuRef = undefined;
    });
  }

  navigateTo(route: string): void {
    this.selectedRoute = route;
    this.router.navigate([route]);
  }

  isSelected(navItem: NavItem) {
    return navItem.id === this.selectedRoute;
  }
}
