import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TuiLoader } from '@taiga-ui/core';

/**
 * Loading Page Component to display while loading information from the backend.
 */
@Component({
  selector: 'loading-page',
  templateUrl: './loading-page.component.html',
  styleUrls: ['./loading-page.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TuiLoader]
})
export default class LoadingPageComponent {}
