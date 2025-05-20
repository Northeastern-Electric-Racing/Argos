import { Component, Input } from '@angular/core';
import TypographyComponent from '../typography/typography.component';

/**
 * Error Page Component to display when an error occurs.
 * @param errorMessage The error message to display.
 */
@Component({
    selector: 'error-page',
    templateUrl: './error-page.component.html',
    styleUrls: ['./error-page.component.css'],
    imports: [TypographyComponent],
    standalone: true,
})
export default class ErrorPageComponent {
  @Input() errorMessage!: string;
}
