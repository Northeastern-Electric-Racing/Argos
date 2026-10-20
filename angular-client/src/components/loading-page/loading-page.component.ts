import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

/**
 * Loading Page Component to display while loading information from the backend.
 */
@Component({
  selector: 'loading-page',
  templateUrl: './loading-page.component.html',
  styleUrls: ['./loading-page.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatProgressSpinner]
})
export default class LoadingPageComponent {}
