import { Component, inject, OnInit, DestroyRef, ChangeDetectionStrategy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { interval, map, Observable, startWith } from 'rxjs';
import { startNewRun } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import SidebarService from 'src/services/sidebar.service';
import { appRoutes } from '../app-routes';
import { Drawer } from 'primeng/drawer';
import { CurrentRunDisplayComponent } from '../../pages/landing-page/components/current-run-display/current-run-display.component';
import { MessagesPerSecondComponent } from '../../components/messages-per-second/messages-per-second.component';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import SidebarChipComponent from 'src/components/sidebar-chip/sidebar-chip.component';
import { filter } from 'rxjs/operators';
import { RunFormComponent } from 'src/components/run-form/run-form.component';
import { NotificationLogService } from 'src/services/notification-log.service';
import { NotificationListComponent } from 'src/components/notification-list/notification-list.component';
import { Popover } from 'primeng/popover';
import { Badge } from 'primeng/badge';
import { Menu } from 'primeng/menu';
import { Button } from 'primeng/button';
import { MenuItem } from 'primeng/api';

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
    Drawer,
    CurrentRunDisplayComponent,
    Button,
    MessagesPerSecondComponent,
    AsyncPipe,
    DatePipe,
    TypographyComponent,
    HStackComponent,
    SidebarChipComponent,
    MatIcon,
    NotificationListComponent,
    Popover,
    Badge,
    Menu
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    '(window:resize)': 'onResize()'
  }
})
export class AppNavBarComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private serverService = inject(APIService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private sidebarService = inject(SidebarService);
  private dialogService = inject(DialogService);
  protected notificationLogService = inject(NotificationLogService);

  ref: DynamicDialogRef | null | undefined;
  editRunRef: DynamicDialogRef | null | undefined;

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

  readonly newRunIsLoading = signal(false);
  time$: Observable<Date> = interval(1000).pipe(
    startWith(0),
    map(() => new Date())
  );

  // The query service leaves isLoading set when a request fails, so the button tracks its own request
  onStartNewRun = () => {
    this.newRunIsLoading.set(true);
    const runsQueryResponse = this.serverService.query(() => startNewRun(), { invalidates: ['runs'] });
    runsQueryResponse.error.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      if (!error) return;
      this.newRunIsLoading.set(false);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    });
    runsQueryResponse.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((run) => {
      if (!run) return;
      this.newRunIsLoading.set(false);
      this.messageService.add({
        severity: 'success',
        summary: 'New Run Started',
        detail: 'Your new run has started successfully.'
      });
    });
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

  // The notification list draws its own card, so the popover frame and arrow are transparent
  notificationPopoverTokens = {
    root: {
      background: 'transparent',
      borderColor: 'transparent',
      borderRadius: 'var(--border-radius-panel)',
      shadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
    },
    content: { padding: '0' }
  };

  // The apps menu: a PrimeNG popup Menu (menu/menuitem roles, arrow keys, Escape, outside click)
  appsMenuOpen = false;
  appsMenuTokens = {
    root: { background: '{surface.800}', borderColor: 'transparent', borderRadius: '20px', color: '#ffffff' },
    list: { padding: '16px', gap: '12px' },
    item: { focusBackground: 'transparent', color: '#ffffff', focusColor: '#ef4345' }
  };
  appsMenuItems: MenuItem[] = this.navMenuItems.map((navItem) => ({
    label: navItem.label,
    icon: navItem.icon,
    command: () => navItem.onClick()
  }));

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
