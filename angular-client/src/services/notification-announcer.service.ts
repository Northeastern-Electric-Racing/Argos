import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Injectable, inject } from '@angular/core';
import { NzNotificationRef, NzNotificationService } from 'ng-zorro-antd/notification';

/**
 * nz-notification renders its toasts without role="alert" or aria-live, so screen readers don't hear them.
 * Show toasts through this instead of NzNotificationService: it opens the same nz-notification and reads
 * its title and text out through the CDK's LiveAnnouncer (assertive, like PrimeNG's p-toast).
 */
@Injectable({ providedIn: 'root' })
export class NotificationAnnouncerService {
  private notification = inject(NzNotificationService);
  private liveAnnouncer = inject(LiveAnnouncer);

  create(...args: Parameters<NzNotificationService['create']>): NzNotificationRef {
    const [, title, content] = args;
    const ref = this.notification.create(...args);
    const message = [title, content]
      .filter((part): part is string => typeof part === 'string' && part.trim() !== '')
      .join('. ');
    if (message) this.liveAnnouncer.announce(message, 'assertive');
    return ref;
  }
}
