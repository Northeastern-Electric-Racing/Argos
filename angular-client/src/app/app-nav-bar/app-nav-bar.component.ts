import {
  Component,
  inject,
  input,
  OnInit,
  DestroyRef,
  ChangeDetectionStrategy,
  signal,
  WritableSignal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { ToastService } from 'src/services/toast.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenav, MatSidenavContainer } from '@angular/material/sidenav';
import { MatBadge } from '@angular/material/badge';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { MatToolbar } from '@angular/material/toolbar';
import { MatListItem, MatListItemIcon, MatListItemTitle, MatNavList } from '@angular/material/list';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { CdkMenuTrigger } from '@angular/cdk/menu';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { interval, map, Observable, startWith } from 'rxjs';
import { startNewRun } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import SidebarService from 'src/services/sidebar.service';
import { appRoutes } from '../app-routes';
import { CurrentRunDisplayComponent } from '../../pages/landing-page/components/current-run-display/current-run-display.component';
import { MessagesPerSecondComponent } from '../../components/messages-per-second/messages-per-second.component';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from 'src/components/typography/typography.component';
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
    MatSidenavContainer,
    MatSidenav,
    MatBadge,
    MatNavList,
    MatListItem,
    MatListItemIcon,
    MatListItemTitle,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    CdkMenuTrigger,
    CdkTrapFocus,
    NavOptionsMenuComponent,
    CurrentRunDisplayComponent,
    MessagesPerSecondComponent,
    AsyncPipe,
    DatePipe,
    TypographyComponent,
    MatToolbar,
    MatTabNav,
    MatTabLink,
    MatButton,
    MatIconButton,
    RouterLink,
    MatIcon,
    NotificationListComponent
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
  private dialog = inject(MatDialog);
  protected notificationLogService = inject(NotificationLogService);

  /** The page area the desktop tab nav bar labels (app-context wraps the router outlet in it). */
  tabPanel = input<MatTabNavPanel>();

  /**
   * The apps grid is a CDK menu (keyboard navigation, focus management and ARIA come from
   * @angular/cdk/menu); the notifications panel is a CDK overlay. Both anchor to their nav bar buttons.
   */
  menuOpen = signal(false);
  notificationsOpen = signal(false);
  readonly overlayPositions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 }
  ];

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
    runsQueryResponse.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((run) => {
      if (run) {
        this.messageService.add({
          severity: 'success',
          summary: 'New Run Started',
          detail: 'Your new run has started successfully.'
        });
      }
    });
  };

  openRunForm = () => {
    this.dialog.open(RunFormComponent, { width: '550px' });
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

  closeOnEscape(event: KeyboardEvent, open: WritableSignal<boolean>) {
    if (event.key === 'Escape') open.set(false);
  }

  toggleNotifications() {
    this.notificationsOpen.update((open) => !open);
  }

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
