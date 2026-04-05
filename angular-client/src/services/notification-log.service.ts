import { Injectable, NgZone, inject, signal, computed } from '@angular/core';
import { RuleNotification } from 'src/utils/types.utils';

export interface NotificationLogEntry {
  id: number;
  notification: RuleNotification;
  read: boolean;
}

const MAX_ENTRIES = 500;
const RECENT_LIMIT = 10;

@Injectable({
  providedIn: 'root'
})
export class NotificationLogService {
  private ngZone = inject(NgZone);

  private entries = signal<NotificationLogEntry[]>([]);
  private nextId = 0;

  readonly notifications = this.entries.asReadonly();
  readonly unreadCount = computed(() => this.entries().filter((e) => !e.read).length);
  readonly recentNotifications = computed(() => this.entries().slice(0, RECENT_LIMIT));

  addNotification(notification: RuleNotification): void {
    this.ngZone.run(() => {
      this.entries.update((current) => {
        const next = [{ id: this.nextId++, notification, read: false }, ...current];
        return next.slice(0, MAX_ENTRIES);
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
