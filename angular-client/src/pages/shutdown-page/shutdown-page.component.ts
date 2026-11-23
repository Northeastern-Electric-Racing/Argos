import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  inject,
  isDevMode,
  signal,
  viewChild
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { injectFocusAfterRender } from 'src/ui/focus/focus-after-render';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { typographyClass } from 'src/ui/recipes/typography';
import { CarViewComponent } from './components/car-view/car-view.component';
import { CarView3dComponent } from './components/car-view-3d/car-view-3d.component';
import { FALLBACK_NOTICES, FallbackReason } from './components/car-view-3d/car-view-3d.utils';
import { CarViewModeComponent, readCarViewMode } from './components/car-view-mode/car-view-mode.component';
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
 * The car is drawn in 2D or 3D (car-view-mode); 3D falls back to the 2D view when it can't draw.
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
    CarView3dComponent,
    CarViewModeComponent,
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

  /** 2D or 3D car view: the stored choice, else 3D on a wide screen with a fine pointer. */
  readonly carMode = signal(readCarViewMode());
  /** Why the 3D view fell back to 2D, until 3D is chosen again. */
  readonly carNotice = signal<string | null>(null);
  private readonly doc = inject(DOCUMENT);
  private readonly carSection = viewChild.required<ElementRef<HTMLElement>>('carSection');
  private readonly focusAfterRender = injectFocusAfterRender({ preventScroll: true });

  /** The 3D view can't draw: show the 2D car with a notice (not remembered), keeping focus in the car section. */
  onCarUnavailable(reason: FallbackReason): void {
    const section = this.carSection().nativeElement;
    const hadFocus = section.contains(this.doc.activeElement);
    this.carNotice.set(FALLBACK_NOTICES[reason]);
    this.carMode.set('2d');
    if (hadFocus) this.focusAfterRender(() => section);
  }

  protected readonly titleClass = typographyClass('x-large-title', 'm-0 max-md:text-title');
  /** A card's title: the app's header type, with its icon. */
  protected readonly cardTitleClass = typographyClass('header', 'm-0 flex items-center gap-2 text-base');
}
