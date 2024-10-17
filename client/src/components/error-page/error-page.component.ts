import { Component, Input } from '@angular/core';

/**
 * Error Page Component to display when an error occurs.
 * @param errorMessage The error message to display.
 */
@Component({
  selector: 'error-page',
  templateUrl: './error-page.component.html',
  styleUrls: ['./error-page.component.css']
})
export default class ErrorPage {
  @Input() errorMessage!: string;
}
