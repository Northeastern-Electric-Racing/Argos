import { Component, inject, OnDestroy, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MessageService, PrimeTemplate } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { interval, map, Observable, startWith } from 'rxjs';
import { startNewRun } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import SidebarService from 'src/services/sidebar.service';
import { appRoutes } from '../app-routes';
import { Drawer } from 'primeng/drawer';
import { CurrentRunDisplayComponent } from '../../components/current-run-display/current-run-display.component';
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
import { Popover } from 'primeng/popover';
import { Badge } from 'primeng/badge';

export interface NavItem {
  label: string;
  icon: string;
  // Router destination, bound with routerLink so the router owns navigation and highlighting.
  route?: string;
  // Runs instead of navigating, for the items that are not pages (Edit Runs).
  action?: () => void;
}

@Component({
  selector: 'app-nav-bar',
  templateUrl: './app-nav-bar.component.html',
  styleUrls: ['./app-nav-bar.component.css'],
  standalone: true,
  imports: [
    Drawer,
    PrimeTemplate,
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
    Popover,
    Badge,
    RouterLink,
    RouterLinkActive
  ],
  host: {
    '(window:resize)': 'onResize()'
  }
})
export class AppNavBarComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private serverService = inject(APIService);
  private messageService = inject(MessageService);
  private sidebarService = inject(SidebarService);
  private dialogService = inject(DialogService);
  protected notificationLogService = inject(NotificationLogService);

  ref: DynamicDialogRef | null | undefined;
  menuRef: DynamicDialogRef | null | undefined;
  editRunRef: DynamicDialogRef | null | undefined;

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
    if (this.menuRef) {
      this.menuRef.close();
    }
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
      header: 'Edit Run',
      closable: true,
      closeAriaLabel: 'Close'
    });
  };

  // The landing page was removed in #847, so the home logo opens the graph page.
  homeNavItem: NavItem = {
    label: 'Home',
    route: appRoutes.graphRoute(),
    icon: 'logo'
  };

  mostUsedNavItems: NavItem[] = [
    {
      label: 'Charging',
      route: appRoutes.chargingRoute(),
      icon: 'ev_station'
    },
    {
      label: 'Graph',
      route: appRoutes.graphRoute(),
      icon: 'bar_chart'
    },
    { label: 'BMS', route: appRoutes.bmsRoute(), icon: 'action_key' },
    {
      label: 'eFuses',
      route: appRoutes.efusesRoute(),
      icon: 'electrical_services'
    }
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

  navMenuItems: NavItem[] = [
    {
      label: 'Fault',
      route: appRoutes.faultsRoute(),
      icon: 'error'
    },
    {
      label: 'Map',
      route: appRoutes.mapRoute(),
      icon: 'map'
    },
    {
      label: 'Camera',
      route: appRoutes.cameraRoute(),
      icon: 'linked_camera'
    },
    {
      label: 'Edit Runs',
      action: this.openRunForm,
      icon: 'edit'
    },
    {
      label: 'Commands',
      route: appRoutes.commandsRoute(),
      icon: 'electrical_services'
    },
    {
      label: 'Rules',
      route: appRoutes.rulesRoute(),
      icon: 'notifications'
    },
    {
      label: 'Lap Timer',
      route: appRoutes.lapTimerRoute(),
      icon: 'timer'
    }
  ];

  // The home logo is desktop-only; in the sidebar its graph-page destination is already listed.
  allNavItems: NavItem[] = [...this.mostUsedNavItems, ...this.navMenuItems];

  openMenu() {
    this.menuRef = this.dialogService.open(NavOptionsMenuComponent, {
      showHeader: false,
      modal: true,
      // PrimeNG 21 only closes on mask click or Escape when the dialog is closable
      closable: true,
      dismissableMask: true,
      styleClass: 'nav-options-dialog',
      baseZIndex: 10000,
      width: 'auto',
      data: {
        items: this.navMenuItems
      }
    });

    this.menuRef?.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.menuRef = undefined;
    });
  }

  onNotificationPanelShow(): void {
    this.notificationLogService.markAllRead();
  }
}
