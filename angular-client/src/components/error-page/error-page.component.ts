import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import TypographyComponent from '../typography/typography.component';

/**
 * Error Page Component to display when an error occurs.
 * @param errorMessage The error message to display.
 */
@Component({
  selector: 'error-page',
  templateUrl: './error-page.component.html',
  imports: [TypographyComponent],
  changeDetection: ChangeDetectionStrategy.Eager
})
export default class ErrorPageComponent {
  errorMessage = input.required<string>();
}
