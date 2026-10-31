import {
  Component,
  inject,
  OnInit,
  DestroyRef,
  ChangeDetectionStrategy,
  TemplateRef,
  viewChild,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { NotificationAnnouncerService } from 'src/services/notification-announcer.service';
import { NzModalService } from 'ng-zorro-antd/modal';
import { interval, map, merge, Observable, startWith, take } from 'rxjs';
import { startNewRun } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import SidebarService from 'src/services/sidebar.service';
import { appRoutes } from '../app-routes';
import { NzDrawerRef, NzDrawerService } from 'ng-zorro-antd/drawer';
import { CurrentRunDisplayComponent } from '../../pages/landing-page/components/current-run-display/current-run-display.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
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
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzBadgeModule } from 'ng-zorro-antd/badge';

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
    CurrentRunDisplayComponent,
    NzButtonModule,
    MessagesPerSecondComponent,
    AsyncPipe,
    DatePipe,
    TypographyComponent,
    HStackComponent,
    SidebarChipComponent,
    MatIcon,
    NotificationListComponent,
    NzPopoverModule,
    NzBadgeModule,
    NavOptionsMenuComponent
  ],
  providers: [NzDrawerService],
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    '(window:resize)': 'onResize()'
  }
})
export class AppNavBarComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private serverService = inject(APIService);
  private notification = inject(NotificationAnnouncerService);
  private router = inject(Router);
  private sidebarService = inject(SidebarService);
  private modal = inject(NzModalService);
  private drawerService = inject(NzDrawerService);
  protected notificationLogService = inject(NotificationLogService);

  menuOpen = false;

  // Set selected route to current URL path
  selectedRoute: string = window.location.pathname;
  /** Whether the nav drawer is open; a signal, since it closes from the drawer's own timer. */
  sidebarVisible = signal(false);
  isMobile = window.innerWidth <= 768;
  isWindowSmall = window.innerWidth <= 1160 && !this.isMobile;

  private drawerTitle = viewChild.required<TemplateRef<object>>('drawerTitle');
  private drawerContent = viewChild.required<TemplateRef<{ $implicit: unknown; drawerRef: NzDrawerRef }>>('drawerContent');
  private drawerRef: NzDrawerRef | undefined;

  ngOnInit(): void {
    this.sidebarService.isOpen.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isOpen) => {
      if (isOpen) this.openDrawer();
    });
    this.destroyRef.onDestroy(() => this.drawerRef?.close());
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        this.selectedRoute = event.url;
        // Picking a page closes the nav drawer. This also keeps Esc working: a page's own drawer attaches its
        // overlay later, so the CDK would hand Esc to that one instead.
        this.drawerRef?.close();
      });
  }

  /**
   * The nav drawer is opened through NzDrawerService rather than kept in the template closed. A closed
   * <nz-drawer> with *nzDrawerContent leaves its content branch stale after its close animation (it clears the
   * flag in a timeout without marking itself for check), which zoneless change detection reports as NG0100.
   * A service drawer is created open and disposed once closed, so it never sits closed.
   */
  private openDrawer(): void {
    if (this.drawerRef) return;
    this.sidebarVisible.set(true);
    this.drawerRef = this.drawerService.create({
      nzPlacement: 'left',
      nzClosable: true,
      nzTitle: this.drawerTitle(),
      nzContent: this.drawerContent()
    });
    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- afterClose completes when the drawer closes
    this.drawerRef.afterClose.subscribe(() => {
      this.drawerRef = undefined;
      this.sidebarVisible.set(false);
    });
  }

  // on resize, set the screen width
  onResize(): void {
    this.isMobile = window.innerWidth <= 768;
    this.isWindowSmall = window.innerWidth <= 1160 && !this.isMobile;
  }

  newRunIsLoading = signal(false);
  time$: Observable<Date> = interval(1000).pipe(
    startWith(0),
    map(() => new Date())
  );

  /** Starts a run; the button spins until the server answers, then a toast says how it went. */
  onStartNewRun = () => {
    const runsQueryResponse = this.serverService.query(() => startNewRun(), { invalidates: ['runs'] });
    this.newRunIsLoading.set(true);
    merge(
      runsQueryResponse.data.pipe(
        filter((run) => run !== null),
        map(() => null)
      ),
      runsQueryResponse.error.pipe(filter((error): error is Error => error !== null))
    )
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((error) => {
        this.newRunIsLoading.set(false);
        if (error) {
          this.notification.create('error', 'Error', error.message);
        } else {
          this.notification.create('success', 'New Run Started', 'Your new run has started successfully.');
        }
      });
  };

  openRunForm = () => {
    this.menuOpen = false;
    this.modal.create({
      nzContent: RunFormComponent,
      nzWidth: 550,
      nzTitle: 'Edit Run',
      nzFooter: null
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
