import { Injectable, NgZone, inject, signal, computed } from '@angular/core';
import { RuleNotification } from 'src/utils/types.utils';

export interface NotificationLogEntry {
  id: number;
  notification: RuleNotification;
  read: boolean;
}

const MAX_ENTRIES = 500;
const RECENT_LIMIT = 10;

/**
 * Session-scoped log of rule_notify events received over the socket.
 *
 * Holds up to MAX_ENTRIES notifications (oldest dropped when full) and exposes them as signals
 * consumed by the nav bell popover, the Rules page stream rail, and the /notification-log page.
 * State is in-memory only — cleared on page reload.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationLogService {
  private ngZone = inject(NgZone);

  private entries = signal<NotificationLogEntry[]>([]);
  private nextId = 0;

  /** All entries, newest first. Used by the Rules stream rail and /notification-log page. */
  readonly notifications = this.entries.asReadonly();
  /** Count of entries the user hasn't seen yet — drives the nav bell badge. */
  readonly unreadCount = computed(() => this.entries().filter((e) => !e.read).length);
  /** Newest RECENT_LIMIT entries — used by the nav bell popover dropdown. */
  readonly recentNotifications = computed(() => this.entries().slice(0, RECENT_LIMIT));

  /**
   * Prepend a new notification. Called from the socket service's rule_notify handler.
   * Wrapped in ngZone.run because socket.io callbacks fire outside Angular's zone.
   */
  addNotification(notification: RuleNotification): void {
    this.ngZone.run(() => {
      this.entries.update((current) => {
        const next = [{ id: this.nextId++, notification, read: false }, ...current];
        return next.slice(0, MAX_ENTRIES);
      });
    });
  }

  /**
   * Flip every unread entry to read. Currently called when the nav bell popover opens
   * (onShow), which clears the unread badge as soon as the user sees the list.
   */
  markAllRead(): void {
    this.entries.update((current) => current.map((e) => (e.read ? e : { ...e, read: true })));
  }

  /** Remove a single entry by id — used by per-row dismiss buttons. */
  dismissEntry(entryId: number): void {
    this.entries.update((current) => current.filter((e) => e.id !== entryId));
  }

  /** Empty the entire log — used by the "Clear All" button. */
  clearAll(): void {
    this.entries.set([]);
  }
}
