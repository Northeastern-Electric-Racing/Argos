import { ChangeDetectionStrategy, Component, inject, isDevMode } from '@angular/core';
import { CarViewSwitchComponent } from './components/car-view-switch/car-view-switch.component';
import { LoopBannerComponent } from './components/loop-banner/loop-banner.component';
import { LoopStripComponent } from './components/loop-strip/loop-strip.component';
import { MockPanelComponent } from './components/mock-panel/mock-panel.component';
import { ShutdownLoopService } from './shutdown-loop.service';

/**
 * Shutdown Loop page: live view of the series shutdown circuit that names the node that broke it.
 */
@Component({
  selector: 'shutdown-page',
  templateUrl: './shutdown-page.component.html',
  styleUrls: ['./shutdown-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ShutdownLoopService],
  imports: [LoopBannerComponent, CarViewSwitchComponent, LoopStripComponent, MockPanelComponent]
})
export default class ShutdownPageComponent {
  private loop = inject(ShutdownLoopService);

  readonly status = this.loop.status;
  readonly tsOn = this.loop.tsOn;
  readonly devMode = isDevMode();
}
