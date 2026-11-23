import { ChangeDetectionStrategy, Component, inject, isDevMode, signal } from '@angular/core';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import TypographyComponent from 'src/components/typography/typography.component';
import { CarViewComponent } from './components/car-view/car-view.component';
import { CarView3dComponent } from './components/car-view-3d/car-view-3d.component';
import { FALLBACK_NOTICES, FallbackReason } from './components/car-view-3d/car-view-3d.utils';
import { CarViewMode, CarViewModeComponent, injectCarViewMode } from './components/car-view-mode/car-view-mode.component';
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
 * in loop-node-detail. The car shows in 2D or 3D (car-view-mode); when 3D can't run, the page falls back to 2D
 * with a notice.
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
    UiIconComponent,
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

  readonly carMode = injectCarViewMode();
  /** Why the 3D view gave up, shown above the 2D fallback until 3D is chosen again. */
  readonly carNotice = signal('');

  setCarMode(mode: CarViewMode): void {
    this.carMode.set(mode);
    if (mode === '3d') this.carNotice.set('');
  }

  onCarUnavailable(reason: FallbackReason): void {
    this.carNotice.set(FALLBACK_NOTICES[reason]);
    this.carMode.set('2d');
  }
}
