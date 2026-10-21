import { DialogRef } from '@angular/cdk/dialog';
import { ToastService } from 'src/ui/toast/toast.service';
import { UiDialogService } from 'src/ui/dialog/dialog.service';
import { Component, inject, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { interval, map, Observable, startWith } from 'rxjs';
import { startNewRun } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import SidebarService from 'src/services/sidebar.service';
import { appRoutes } from '../app-routes';
import { UiDrawerComponent } from 'src/ui/drawer/drawer.component';
import { UiPopoverComponent } from 'src/ui/popover/popover.component';
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
import { NotificationLogService } from 'src/services/notification-log.service';
import { NotificationListComponent } from 'src/components/notification-list/notification-list.component';

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
  imports: [
    UiDrawerComponent,
    CurrentRunDisplayComponent,
    ToastButtonComponent,
    MessagesPerSecondComponent,
    AsyncPipe,
    DatePipe,
    TypographyComponent,
    HStackComponent,
    SidebarChipComponent,
    MatIcon,
    NotificationListComponent,
    UiPopoverComponent,
    NavOptionsMenuComponent
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    '(window:resize)': 'onResize()'
  }
})
export class AppNavBarComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private serverService = inject(APIService);
  private messageService = inject(ToastService);
  private router = inject(Router);
  private sidebarService = inject(SidebarService);
  private dialogService = inject(UiDialogService);
  protected notificationLogService = inject(NotificationLogService);

  ref: DialogRef | null | undefined;
  editRunRef: DialogRef | null | undefined;

  // Set selected route to current URL path
  selectedRoute: string = window.location.pathname;
  sidebarVisible = false;
  isMobile = false;
  isWindowSmall = window.innerWidth <= 1160 && !this.isMobile;

  ngOnInit(): void {
    this.sidebarService.isOpen.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isOpen) => {
      this.sidebarVisible = isOpen;
    });
    this.isMobile = window.innerWidth <= 768;
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        this.selectedRoute = event.url;
      });
  }

  // on resize, set the screen width
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
    runsQueryResponse.isLoading.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isLoading: boolean) => {
      this.newRunIsLoading = isLoading;
    });
    runsQueryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (error) this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    });
  };

  openRunForm = () => {
    this.editRunRef = this.dialogService.open(RunFormComponent, {
      width: '550px',
      header: 'Edit Run'
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
    { id: appRoutes.bmsRoute(), label: 'BMS', onClick: () => this.navigateTo(appRoutes.bmsRoute()), icon: 'action_key' },
    {
      id: appRoutes.efusesRoute(),
      label: 'eFuses',
      onClick: () => this.navigateTo(appRoutes.efusesRoute()),
      icon: 'electrical_services'
    }
  ];

  onlyDesktopNavItems: NavItem[] = [...this.mostUsedNavItems];

  navMenuItems: NavItem[] = [
    {
      id: appRoutes.faultsRoute(),
      label: 'Fault',
      onClick: () => this.navigateTo(appRoutes.faultsRoute()),
      icon: 'error'
    },
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
    },
    {
      id: appRoutes.rulesRoute(),
      label: 'Rules',
      onClick: () => this.navigateTo(appRoutes.rulesRoute()),
      icon: 'notifications'
    },
    {
      id: appRoutes.lapTimerRoute(),
      label: 'Lap Timer',
      onClick: () => this.navigateTo(appRoutes.lapTimerRoute()),
      icon: 'timer'
    }
  ];

  allNavItems: NavItem[] = [this.homeNavItem, ...this.mostUsedNavItems, ...this.navMenuItems];

  navigateTo(route: string): void {
    this.selectedRoute = route;
    this.router.navigate([route]);
  }

  onNotificationPanelShow(): void {
    this.notificationLogService.markAllRead();
  }

  isSelected(navItem: NavItem) {
    return navItem.id === this.selectedRoute;
  }
}
