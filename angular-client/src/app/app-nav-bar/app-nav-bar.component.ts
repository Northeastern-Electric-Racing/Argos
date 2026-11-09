import { DialogRef } from '@angular/cdk/dialog';
import { ToastService } from 'src/ui/toast/toast.service';
import { UiDialogService } from 'src/ui/dialog/dialog.service';
import {
  Component,
  inject,
  OnInit,
  DestroyRef,
  ChangeDetectionStrategy,
  Injector,
  afterNextRender,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { interval, map, Observable, startWith } from 'rxjs';
import { startNewRun, updateRun } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import SidebarService from 'src/services/sidebar.service';
import { appRoutes } from '../app-routes';
import { UiDrawerComponent } from 'src/ui/drawer/drawer.component';
import { CurrentRunDisplayComponent } from '../../pages/landing-page/components/current-run-display/current-run-display.component';
import { UiButtonDirective } from 'src/ui/button/button.directive';
import { MessagesPerSecondComponent } from '../../components/messages-per-second/messages-per-second.component';
import { AsyncPipe, DatePipe } from '@angular/common';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import SidebarChipComponent from 'src/components/sidebar-chip/sidebar-chip.component';
import { NavOptionsMenuComponent } from 'src/components/nav-options-menu/nav-options-menu.component';
import { filter, take } from 'rxjs/operators';
import { FormGroup } from '@angular/forms';
import { RunFormComponent } from 'src/components/run-form/run-form.component';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';
import { focusIsLost, focusNewPage, pageLabel } from './focus-new-page';

export interface NavItem {
  id: string;
  label: string;
  onClick: () => void;
  icon: string;
}

@Component({
  selector: 'app-nav-bar',
  templateUrl: './app-nav-bar.component.html',
  imports: [
    UiDrawerComponent,
    CurrentRunDisplayComponent,
    UiButtonDirective,
    MessagesPerSecondComponent,
    AsyncPipe,
    DatePipe,
    TypographyComponent,
    HStackComponent,
    SidebarChipComponent,
    UiIconComponent,
    NotificationBellComponent,
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
  private injector = inject(Injector);

  ref: DialogRef | null | undefined;
  editRunRef: DialogRef<FormGroup> | null | undefined;

  // Set selected route to current URL path
  selectedRoute: string = window.location.pathname;
  /** The mobile nav drawer; a signal, so the zoneless app re-renders when the sidebar service opens it. */
  sidebarVisible = signal(false);
  /** False until the first navigation (page load) ends. */
  private navigatedBefore = false;
  isMobile = false;
  isWindowSmall = window.innerWidth <= 1160 && !this.isMobile;

  ngOnInit(): void {
    this.sidebarService.isOpen.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isOpen) => {
      this.sidebarVisible.set(isOpen);
    });
    this.isMobile = window.innerWidth <= 768;
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        this.selectedRoute = event.url;
        const label = pageLabel(event.urlAfterRedirects, this.allNavItems);
        // A nav item was chosen in the drawer: close it. Its trigger left with the old page, so focus goes to
        // the new page's menu button when it has one, and otherwise to the page itself in the main region, never
        // to <body>.
        if (this.sidebarVisible()) {
          this.sidebarVisible.set(false);
          afterNextRender(() => focusNewPage(label), { injector: this.injector });
        } else if (this.navigatedBefore) {
          // Any other in-app navigation (See more, the segment selector, a row that opens a page): when the
          // control that started it left with the old page, focus lands the same way. Page load is left alone.
          afterNextRender(() => focusIsLost() && focusNewPage(label), { injector: this.injector });
        }
        this.navigatedBefore = true;
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

  /** Starts a new run and confirms it with a toast (as the toast button did; an error adds its own toast). */
  startNewRun(): void {
    this.onStartNewRun();
    setTimeout(() =>
      this.messageService.add({
        severity: 'success',
        summary: 'New Run Started',
        detail: 'Your new run has started successfully.'
      })
    );
  }

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
    const ref = this.dialogService.open<FormGroup>(RunFormComponent, {
      width: '550px',
      header: 'Edit Run'
    });
    this.editRunRef = ref;
    // Read the chosen run off the form here: close() destroys it before closed emits.
    const runForm = ref.componentInstance as RunFormComponent | null;

    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- one-shot dialog result; take(1) ends it, and tying it to destroy could drop the result
    ref.closed.pipe(take(1)).subscribe((form) => {
      // Closed without submitting (close button, Escape): nothing to save.
      if (!form) return;
      const run = runForm?.selectedRun;
      if (run === undefined) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No run selected' });
        return;
      }
      updateRun(
        run.id,
        form.controls['driverName'].value,
        form.controls['locationName'].value,
        form.controls['notes'].value
      );
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

  isSelected(navItem: NavItem) {
    return navItem.id === this.selectedRoute;
  }
}
