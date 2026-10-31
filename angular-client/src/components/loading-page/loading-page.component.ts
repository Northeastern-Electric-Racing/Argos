import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NzSpinModule } from 'ng-zorro-antd/spin';

/**
 * Loading Page Component to display while loading information from the backend.
 */
@Component({
  selector: 'loading-page',
  templateUrl: './loading-page.component.html',
  styleUrls: ['./loading-page.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [NzSpinModule]
})
export default class LoadingPageComponent {}
