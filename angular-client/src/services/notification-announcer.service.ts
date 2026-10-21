import { LiveAnnouncer } from '@angular/cdk/a11y';
import { OverlayContainer } from '@angular/cdk/overlay';
import { DestroyRef, Injectable, inject } from '@angular/core';

/**
 * nz-notification renders its toasts without role="alert" or aria-live, so screen readers don't hear them.
 * This watches the CDK overlay container, where ng-zorro puts the toasts, and reads
 * each new one out through the CDK's LiveAnnouncer.
 */
@Injectable({ providedIn: 'root' })
export class NotificationAnnouncerService {
  private liveAnnouncer = inject(LiveAnnouncer);
  private overlayContainer = inject(OverlayContainer);
  private destroyRef = inject(DestroyRef);
  private observer?: MutationObserver;

  start() {
    if (this.observer || typeof MutationObserver === 'undefined') return;
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.matches('nz-notification')) this.announce(node);
        });
      }
    });
    this.observer.observe(this.overlayContainer.getContainerElement(), { childList: true, subtree: true });
    this.destroyRef.onDestroy(() => this.observer?.disconnect());
  }

  /** The toast's title and text are bound after it's inserted, so read them on the next tick. */
  private announce(notification: HTMLElement) {
    setTimeout(() => {
      const parts = ['.ant-notification-notice-message', '.ant-notification-notice-description'].map((selector) =>
        notification.querySelector(selector)?.textContent?.trim()
      );
      const message = parts.filter(Boolean).join('. ');
      if (message) this.liveAnnouncer.announce(message, 'polite');
    });
  }
}
