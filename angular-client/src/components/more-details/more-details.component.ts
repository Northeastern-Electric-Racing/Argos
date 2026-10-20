import { Component, inject } from '@angular/core';
import { ToastService } from 'src/services/toast.service';
import { Router } from '@angular/router';
import Storage from 'src/services/storage.service';
import { ButtonComponent } from '../argos-button/argos-button.component';

@Component({
  selector: 'more-details',
  templateUrl: './more-details.component.html',
  imports: [ButtonComponent]
})
export default class MoreDetailsComponent {
  private router = inject(Router);
  private storage = inject(Storage);
  private toasts = inject(ToastService);
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
      this.toasts.show('Router is disconnected', { label: 'Error', appearance: 'negative' });
    });
  }
}
