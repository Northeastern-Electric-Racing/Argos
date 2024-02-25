import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'more-details',
  templateUrl: './more-details.component.html'
})
export default class MoreDetailsComponent {
  label: string = 'More Details';

  constructor(
    private router: Router,
    private storage: Storage,
    private messageService: MessageService
  ) {}

  goToGraph = () => {
    const runId = this.storage.getCurrentRunId();
    if (runId) {
      this.router.navigate([`graph/true/${runId}`]);
    } else {
      this.showRouterDisconnectedToast();
    }
  };

  showRouterDisconnectedToast() {
    setTimeout(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Router is disconnected'
      });
    });
  }
}
