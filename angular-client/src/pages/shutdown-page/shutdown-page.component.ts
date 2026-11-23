import { ChangeDetectionStrategy, Component, inject, isDevMode } from '@angular/core';
import TypographyComponent from 'src/components/typography/typography.component';
import { CarViewComponent } from './components/car-view/car-view.component';
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
 * in loop-node-detail.
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
}
