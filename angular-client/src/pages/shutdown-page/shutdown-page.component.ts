import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject, isDevMode } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { typographyClass } from 'src/ui/recipes/typography';
import { CarViewComponent } from './components/car-view/car-view.component';
import { LoopBannerComponent } from './components/loop-banner/loop-banner.component';
import { LoopMetaComponent } from './components/loop-meta/loop-meta.component';
import { LoopNodeDetailComponent } from './components/loop-node-detail/loop-node-detail.component';
import { LoopStripComponent } from './components/loop-strip/loop-strip.component';
import { MockPanelComponent } from './components/mock-panel/mock-panel.component';
import { ShutdownLoopService } from './shutdown-loop.service';
import { ShutdownSelectionStore } from './shutdown-selection.store';

/**
 * Tailwind's `sm` (640 px): from here the car view is a control (CarLoopView.interactive); below it the car's
 * markers sit too close to tap apart, so it is an overview and the strip is the control.
 */
export const CAR_INTERACTIVE_QUERY = '(min-width: 640px)';

/**
 * Shutdown Loop page: live view of the series shutdown circuit that names the loop node that broke it. Read top
 * down: the verdict, the loop in series order (full width, above the fold), then the details beside the car. The
 * strip, the car view, the banner and the details share one selection (ShutdownSelectionStore), bound once per view.
 */
@Component({
  selector: 'shutdown-page',
  templateUrl: './shutdown-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ShutdownLoopService, ShutdownSelectionStore],
  imports: [
    UiIconComponent,
    LoopMetaComponent,
    LoopBannerComponent,
    CarViewComponent,
    LoopStripComponent,
    LoopNodeDetailComponent,
    MockPanelComponent
  ]
})
export default class ShutdownPageComponent {
  private loop = inject(ShutdownLoopService);
  protected readonly selection = inject(ShutdownSelectionStore);

  readonly status = this.loop.status;
  readonly tsOn = this.loop.tsOn;
  readonly devMode = isDevMode();
  /** Whether the car view is a control (from `sm` up) or an overview. */
  readonly carInteractive = toSignal(
    inject(BreakpointObserver)
      .observe(CAR_INTERACTIVE_QUERY)
      .pipe(map((s) => s.matches)),
    { requireSync: true }
  );

  protected readonly titleClass = typographyClass('x-large-title', 'm-0 max-md:text-title');
  /** A card's title: the app's header type, with its icon. */
  protected readonly cardTitleClass = typographyClass('header', 'm-0 flex items-center gap-2 text-base');
}
