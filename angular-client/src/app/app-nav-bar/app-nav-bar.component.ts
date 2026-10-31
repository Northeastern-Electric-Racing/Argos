import {
  Component,
  ElementRef,
  inject,
  OnInit,
  DestroyRef,
  ChangeDetectionStrategy,
  effect,
  signal,
  viewChild,
  WritableSignal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ToastService } from 'src/services/toast.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenav, MatSidenavContainer } from '@angular/material/sidenav';
import { MatBadge } from '@angular/material/badge';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatToolbar } from '@angular/material/toolbar';
import { MatTooltip } from '@angular/material/tooltip';
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
import { filter, take } from 'rxjs/operators';
import { RunFormComponent } from 'src/components/run-form/run-form.component';
import { NotificationLogService } from 'src/services/notification-log.service';
import { NotificationListComponent } from 'src/components/notification-list/notification-list.component';

/**
 * Window widths (px, inclusive) where the toolbar changes form. Page links get compact labels, then
 * go icon-only, then move into the apps menu; the run display and clock go small at runCompact (as
 * on base). Between breakpoints, page labels shrink with an ellipsis rather than run under Start New
 * Run, so a long run number can't push the run controls over them.
 */
export const NAV_BREAKPOINTS = { compact: 1400, iconsOnly: 1240, runCompact: 1160, collapsed: 1000, mobile: 768 };

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
    MatTooltip,
    MatButton,
    MatIconButton,
    RouterLink,
    RouterLinkActive,
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

  /**
   * The apps grid is a CDK menu (keyboard navigation, focus management and ARIA come from
   * @angular/cdk/menu); the notifications panel is a CDK overlay. Both anchor to their nav bar buttons.
   */
  menuOpen = signal(false);
  notificationsOpen = signal(false);
  readonly overlayPositions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 }
  ];

  sidebarVisible = false;
  /** The drawer replaces the toolbar. */
  isMobile = false;
  /** Page links are icon-only, named by aria-label and a tooltip. */
  isWindowSmall = false;
  /** Page links use smaller labels so all four fit beside the run controls. */
  isNavCompact = false;
  /** The run display and clock use their small type. */
  isRunCompact = false;
  /** Even icon-only page links don't fit, so they lead the apps menu instead. */
  isNavCollapsed = false;

  private pageLinks = viewChild('pageLinks', { read: ElementRef<HTMLElement> });
  /** Routes of the page links whose labels are ellipsized (a very long run number squeezes them). */
  private truncatedLabels = signal<ReadonlySet<string>>(new Set());

  constructor() {
    // The labels can only be cut short when the nav list's width changes, so re-measure them then.
    effect((onCleanup) => {
      const list: HTMLElement | undefined = this.pageLinks()?.nativeElement;
      if (!list || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => {
        const cut = Array.from(list.querySelectorAll('a[mat-list-item]')).filter((link) => {
          // The title is inline, so its box keeps the full text width; the list item's content box
          // around it clips and ellipsizes. Compare fractional widths: the browser ellipsizes even a
          // sub-pixel overflow, which scrollWidth and clientWidth round away.
          const title = link.querySelector('[matListItemTitle]');
          const box = title?.parentElement;
          return !!box && title!.getBoundingClientRect().width > box.getBoundingClientRect().width + 0.01;
        });
        this.truncatedLabels.set(new Set(cut.map((link) => link.getAttribute('href') ?? '')));
      });
      observer.observe(list);
      onCleanup(() => observer.disconnect());
    });
  }

  ngOnInit(): void {
    this.sidebarService.isOpen.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isOpen) => {
      this.sidebarVisible = isOpen;
    });
    this.onResize();
  }

  /** Whether a page link's label is out of sight: gone in icon-only mode, or cut short by an ellipsis. */
  labelHidden(navItem: NavItem): boolean {
    return this.isWindowSmall || this.truncatedLabels().has(navItem.id);
  }

  onResize(): void {
    const width = window.innerWidth;
    this.isMobile = width <= NAV_BREAKPOINTS.mobile;
    this.isWindowSmall = width <= NAV_BREAKPOINTS.iconsOnly && !this.isMobile;
    this.isNavCompact = width <= NAV_BREAKPOINTS.compact;
    this.isRunCompact = width <= NAV_BREAKPOINTS.runCompact && !this.isMobile;
    this.isNavCollapsed = width <= NAV_BREAKPOINTS.collapsed;
  }

  newRunIsLoading = false;
  time$: Observable<Date> = interval(1000).pipe(
    startWith(0),
    map(() => new Date())
  );

  /** Starts one run per click: the button is disabled (but keeps focus) until the server answers. */
  onStartNewRun = () => {
    if (this.newRunIsLoading) return;
    this.newRunIsLoading = true;
    const runsQueryResponse = this.serverService.query(() => startNewRun(), { invalidates: ['runs'] });
    runsQueryResponse.error.pipe(filter(Boolean), take(1), takeUntilDestroyed(this.destroyRef)).subscribe((error) => {
      this.newRunIsLoading = false;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    });
    runsQueryResponse.data.pipe(filter(Boolean), take(1), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.newRunIsLoading = false;
      this.messageService.add({
        severity: 'success',
        summary: 'New Run Started',
        detail: 'Your new run has started successfully.'
      });
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

  /** The apps menu leads with the main pages once they no longer fit in the toolbar. */
  get appsMenuItems(): NavItem[] {
    return this.isNavCollapsed ? this.collapsedMenuItems : this.navMenuItems;
  }
  private collapsedMenuItems: NavItem[] = [...this.mostUsedNavItems, ...this.navMenuItems];

  closeOnEscape(event: KeyboardEvent, open: WritableSignal<boolean>) {
    if (event.key === 'Escape') open.set(false);
  }

  toggleNotifications() {
    this.notificationsOpen.update((open) => !open);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  onNotificationPanelShow(): void {
    this.notificationLogService.markAllRead();
  }
}
