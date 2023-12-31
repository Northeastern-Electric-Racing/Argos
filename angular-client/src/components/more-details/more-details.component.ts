import { Component } from '@angular/core';
import { Router } from '@angular/router';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'more-details',
  templateUrl: './more-details.component.html'
})
export default class MoreDetails {
  label: string;
  runId = this.storage.getCurrentRunId();

  constructor(
    private router: Router,
    private storage: Storage
  ) {
    this.label = 'More Details';
  }

  goToGraph = () => {
    this.router.navigate([`graph/true/${this.runId}`]);
  };
}
