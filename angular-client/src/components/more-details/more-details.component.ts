import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationAnnouncerService } from 'src/services/notification-announcer.service';
import Storage from 'src/services/storage.service';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'more-details',
  templateUrl: './more-details.component.html',
  imports: [NzButtonModule]
})
export default class MoreDetailsComponent {
  private router = inject(Router);
  private storage = inject(Storage);
  private notification = inject(NotificationAnnouncerService);
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
      this.notification.create('error', 'Error', 'Router is disconnected');
    });
  }
}
