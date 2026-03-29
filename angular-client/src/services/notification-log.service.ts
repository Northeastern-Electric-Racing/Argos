import { Injectable, NgZone, inject, signal, computed } from '@angular/core';
import { RuleNotification } from 'src/utils/types.utils';

export interface NotificationLogEntry {
  id: number;
  notification: RuleNotification;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationLogService {
  private static readonly MAX_ENTRIES = 500;
  private ngZone = inject(NgZone);

  private entries = signal<NotificationLogEntry[]>([]);
  private nextId = 0;

  readonly notifications = this.entries.asReadonly();
  readonly unreadCount = computed(() => this.entries().reduce((count, e) => count + (e.read ? 0 : 1), 0));
  readonly recentNotifications = computed(() => this.entries().slice(0, 10));

  addNotification(notification: RuleNotification): void {
    this.ngZone.run(() => {
      this.entries.update((current) => {
        const updated = [{ id: this.nextId++, notification, read: false }, ...current];
        return updated.length > NotificationLogService.MAX_ENTRIES
          ? updated.slice(0, NotificationLogService.MAX_ENTRIES)
          : updated;
      });
    });
  }

  markAllRead(): void {
    this.entries.update((current) => current.map((e) => (e.read ? e : { ...e, read: true })));
  }

  dismissEntry(entryId: number): void {
    this.entries.update((current) => current.filter((e) => e.id !== entryId));
  }

  clearAll(): void {
    this.entries.set([]);
  }
}
