import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { toast } from '@spartan-ng/brain/sonner';
import Storage from 'src/services/storage.service';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'more-details',
  templateUrl: './more-details.component.html',
  imports: [HlmButton]
})
export default class MoreDetailsComponent {
  private router = inject(Router);
  private storage = inject(Storage);
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
      toast.error('Error', { description: 'Router is disconnected' });
    });
  }
}
