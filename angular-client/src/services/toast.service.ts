import { inject, Injectable } from '@angular/core';
import { TuiNotificationService, type TuiNotificationOptions } from '@taiga-ui/core';

/**
 * Toasts on Taiga's notification service. Taiga opens a notification when it is subscribed to and
 * closes it on unsubscribe, so a component that tied the subscription to its own lifetime would cut
 * toasts short on navigation. This root service owns the subscription instead, so toasts outlive the
 * component that raised them and close on their own timer (or when dismissed).
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly notifications = inject(TuiNotificationService);

  show(content: string, options: Partial<TuiNotificationOptions> = {}): void {
    this.notifications.open(content, options).subscribe();
  }
}
