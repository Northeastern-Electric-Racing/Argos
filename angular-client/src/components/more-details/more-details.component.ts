import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import Storage from 'src/services/storage.service';
import { ButtonComponent } from '../argos-button/argos-button.component';

@Component({
    selector: 'more-details',
    templateUrl: './more-details.component.html',
    standalone: true,
    imports: [ButtonComponent]
})
export default class MoreDetailsComponent {
  private router = inject(Router);
  private storage = inject(Storage);
  private messageService = inject(MessageService);
  label: string = 'More Details';
  goToGraph = () => {
    const runId = this.storage.getCurrentRunId().value;
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
