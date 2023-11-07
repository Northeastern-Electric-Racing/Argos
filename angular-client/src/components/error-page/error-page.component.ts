import { Component, Input } from '@angular/core';

@Component({
  selector: 'error-page',
  templateUrl: './error-page.component.html',
  styleUrls: ['./error-page.component.css']
})
export default class ErrorPage {
  @Input() errorMessage!: string;
}
