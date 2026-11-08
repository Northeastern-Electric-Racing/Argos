import { Component, ChangeDetectionStrategy } from '@angular/core';
import { spinnerClass } from 'src/ui/recipes/spinner';

/**
 * Loading Page Component to display while loading information from the backend.
 */
@Component({
  selector: 'loading-page',
  templateUrl: './loading-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: []
})
export default class LoadingPageComponent {
  protected readonly spinnerClass = spinnerClass;
}
