import { Component } from '@angular/core';
import { Router } from '@angular/router';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'more-details',
  templateUrl: './more-details.component.html',
})
export default class MoreDetailsComponent {
  label: string = 'More Details';
  showToast: boolean = false;

  constructor(
    private router: Router,
    private storage: Storage,
  ) {}

  goToGraph = () => {
    const runId = this.storage.getCurrentRunId();
    if (this.routerIsConnected()) {
      this.router.navigate([`graph/true/${runId}`]);
    } else {
      console.log('Router is disconnected, showing toast.');
      this.showRouterDisconnectedToast();
    }
  };
  

  routerIsConnected(): boolean {
    return false;
  }

  showRouterDisconnectedToast() {
    this.showToast = false;
    setTimeout(() => {
      this.showToast = true;
    });
  }
}
