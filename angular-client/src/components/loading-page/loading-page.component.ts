import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HlmSpinner } from '@spartan-ng/helm/spinner';

/**
 * Loading Page Component to display while loading information from the backend.
 */
@Component({
  selector: 'loading-page',
  templateUrl: './loading-page.component.html',
  styleUrls: ['./loading-page.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [HlmSpinner]
})
export default class LoadingPageComponent {}
