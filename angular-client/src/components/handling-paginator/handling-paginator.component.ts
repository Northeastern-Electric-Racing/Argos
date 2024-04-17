import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'handling-paginator',
  templateUrl: './handling-paginator.component.html',
  styleUrls: ['./handling-paginator.component.css']
})
export class HandlingPaginator {
  constructor(private router: Router) {}

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
