import { Component, inject, OnDestroy, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from 'src/services/toast.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TuiButton, TuiClose, TuiDialogService, TuiDropdown, TuiPopup, TuiTitle } from '@taiga-ui/core';
import { TuiAutoFocus, TuiFocusTrap } from '@taiga-ui/cdk';
import { TuiHeader } from '@taiga-ui/layout';
import { TuiBadgeNotification, TuiDrawer } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { interval, map, Observable, startWith } from 'rxjs';
import { startNewRun } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import SidebarService from 'src/services/sidebar.service';
import { appRoutes } from '../app-routes';
import { CurrentRunDisplayComponent } from '../../pages/landing-page/components/current-run-display/current-run-display.component';
import { ToastButtonComponent } from '../../components/toast-button/toast-button.component';
import { MessagesPerSecondComponent } from '../../components/messages-per-second/messages-per-second.component';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import SidebarChipComponent from 'src/components/sidebar-chip/sidebar-chip.component';
import { NavOptionsMenuComponent } from 'src/components/nav-options-menu/nav-options-menu.component';
import { RunFormComponent } from 'src/components/run-form/run-form.component';
import { NotificationLogService } from 'src/services/notification-log.service';
import { NotificationListComponent } from 'src/components/notification-list/notification-list.component';

/** A page, rendered as a link, or an action (such as opening a dialog), rendered as a button */
export interface NavItem {
  label: string;
  icon: string;
  route?: string;
  action?: () => void;
}

@Component({
  selector: 'app-nav-bar',
  templateUrl: './app-nav-bar.component.html',
  styleUrls: ['./app-nav-bar.component.css'],
  imports: [
    RouterLink,
    RouterLinkActive,
    TuiAutoFocus,
    TuiFocusTrap,
    TuiButton,
    TuiClose,
    TuiDrawer,
    TuiHeader,
    TuiPopup,
    TuiTitle,
    TuiDropdown,
    TuiBadgeNotification,
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
    NavOptionsMenuComponent
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    '(window:resize)': 'onResize()'
  }
})
export class AppNavBarComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private serverService = inject(APIService);
  private toasts = inject(ToastService);
  private sidebarService = inject(SidebarService);
  private dialogs = inject(TuiDialogService);
  protected notificationLogService = inject(NotificationLogService);

  menuOpen = false;
  notificationsOpen = false;

  sidebarVisible = false;
  isMobile = false;
  isWindowSmall = window.innerWidth <= 1160 && !this.isMobile;

  ngOnInit(): void {
    this.sidebarService.isOpen.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isOpen) => {
      this.sidebarVisible = isOpen;
    });
    this.isMobile = window.innerWidth <= 768;
  }

  ngOnDestroy(): void {
    this.menuOpen = false;
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
      if (error) this.toasts.show(error.message, { label: 'Error', appearance: 'negative' });
    });
  };

  openRunForm = () => {
    this.dialogs
      .open(new PolymorpheusComponent(RunFormComponent), { label: 'Edit Run' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  };

  homeNavItem: NavItem = { label: 'Home', route: appRoutes.landingRoute(), icon: 'logo' };

  mostUsedNavItems: NavItem[] = [
    { label: 'Charging', route: appRoutes.chargingRoute(), icon: 'ev_station' },
    { label: 'Graph', route: appRoutes.graphRoute(), icon: 'bar_chart' },
    { label: 'BMS', route: appRoutes.bmsRoute(), icon: 'action_key' },
    { label: 'eFuses', route: appRoutes.efusesRoute(), icon: 'electrical_services' }
  ];

  onlyDesktopNavItems: NavItem[] = [...this.mostUsedNavItems];

  navMenuItems: NavItem[] = [
    { label: 'Fault', route: appRoutes.faultsRoute(), icon: 'error' },
    { label: 'Map', route: appRoutes.mapRoute(), icon: 'map' },
    { label: 'Camera', route: appRoutes.cameraRoute(), icon: 'linked_camera' },
    { label: 'Edit Runs', action: this.openRunForm, icon: 'edit' },
    { label: 'Commands', route: appRoutes.commandsRoute(), icon: 'electrical_services' },
    { label: 'Rules', route: appRoutes.rulesRoute(), icon: 'notifications' },
    { label: 'Lap Timer', route: appRoutes.lapTimerRoute(), icon: 'timer' }
  ];

  allNavItems: NavItem[] = [this.homeNavItem, ...this.mostUsedNavItems, ...this.navMenuItems];

  onMenuItemClick(navItem: NavItem): void {
    this.menuOpen = false;
    navItem.action?.();
  }

  closeSidebar(): void {
    // The drawer's focus trap hands focus back to what opened it only if focus has already left the drawer
    // (Esc and the close button leave it on the close button, which outlives the trap during the leave animation)
    if (document.activeElement instanceof HTMLElement && document.activeElement.closest('tui-drawer')) {
      document.activeElement.blur();
    }
    this.sidebarVisible = false;
  }

  onNotificationPanelChange(open: boolean): void {
    this.notificationsOpen = open;
    if (open) this.notificationLogService.markAllRead();
  }
}
