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
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { injectFocusAfterRender } from 'src/ui/focus/focus-after-render';
import TypographyComponent from 'src/components/typography/typography.component';
import { CarViewComponent } from './components/car-view/car-view.component';
import { CarView3dComponent } from './components/car-view-3d/car-view-3d.component';
import { FALLBACK_NOTICES, FallbackReason } from './components/car-view-3d/car-view-3d.utils';
import { CarViewModeComponent, readCarViewMode } from './components/car-view-mode/car-view-mode.component';
import { LoopBannerComponent } from './components/loop-banner/loop-banner.component';
import { LoopMetaComponent } from './components/loop-meta/loop-meta.component';
import { LoopStripComponent } from './components/loop-strip/loop-strip.component';
import { MockPanelComponent } from './components/mock-panel/mock-panel.component';
import { LoopNodeDetailComponent } from './components/loop-node-detail/loop-node-detail.component';
import { ShutdownLoopService } from './shutdown-loop.service';
import { ShutdownSelectionStore } from './shutdown-selection.store';

/**
 * Shutdown Loop page: live view of the series shutdown circuit that names the loop node that broke it. The loop
 * strip, the car view and the banner share one selection (ShutdownSelectionStore), bound once per view and shown
 * in loop-node-detail. The car is drawn in 2D or 3D (car-view-mode); 3D falls back to the 2D view when it can't draw.
 */
@Component({
  selector: 'shutdown-page',
  templateUrl: './shutdown-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ShutdownLoopService, ShutdownSelectionStore],
  imports: [
    TypographyComponent,
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

  /** Car views are a control from Tailwind's `sm` (640px) up, an overview below it (the strip is the control). */
  readonly carInteractive = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 640px)')
      .pipe(map((state) => state.matches)),
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
}
