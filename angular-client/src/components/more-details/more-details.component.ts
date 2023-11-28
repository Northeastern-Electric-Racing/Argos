import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'more-details',
  templateUrl: './more-details.component.html'
})
export default class MoreDetails {
  label: string;

  constructor(private router: Router) {
    this.label = 'More Details';
  }

  goToPage(pageName: string) {
    this.router.navigate([`${pageName}`]);
  }
}
