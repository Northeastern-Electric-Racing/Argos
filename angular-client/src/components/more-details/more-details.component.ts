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
      console.log('Router is disconnected, showing toast.'); // Add this line for debugging
      this.showRouterDisconnectedToast();
    }
  };
  

  routerIsConnected(): boolean {
    // Here you should implement the logic to check if the router is connected
    // For now, let's assume it returns false to show the toast
    return false;
  }

  showRouterDisconnectedToast() {
    // First, set it to false to ensure that toggling to true is recognized as a change
    this.showToast = false;
    // Use a timeout to allow Angular to register the change to false before setting it to true again
    setTimeout(() => {
      this.showToast = true;
    });
  }
}
