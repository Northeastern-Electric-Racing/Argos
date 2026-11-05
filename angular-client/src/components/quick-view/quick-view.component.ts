import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import StatusBarComponent from 'src/components/status-bar/status-bar.component';
import { QuickViewService } from 'src/services/quick-view.service';
import QuickViewReadoutComponent from './quick-view-readout/quick-view-readout.component';

/**
 * The app's single quick view, hosted once in the app shell. Renders every readout pages and
 * components have registered with {@link QuickViewService}, and nothing when none are.
 */
@Component({
  selector: 'quick-view',
  templateUrl: './quick-view.component.html',
  styleUrl: './quick-view.component.css',
  imports: [StatusBarComponent, QuickViewReadoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class QuickViewComponent {
  protected readonly readouts = inject(QuickViewService).readouts;
}
