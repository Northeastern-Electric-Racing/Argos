import { Injectable, signal, computed } from '@angular/core';
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

  private entries = signal<NotificationLogEntry[]>([]);
  private nextId = 0;

  readonly notifications = computed(() => this.entries());
  readonly unreadCount = computed(() => this.entries().filter((e) => !e.read).length);
  readonly recentNotifications = computed(() => this.entries().slice(0, 10));

  addNotification(notification: RuleNotification): void {
    this.entries.update((current) => {
      const updated = [{ id: this.nextId++, notification, read: false }, ...current];
      return updated.length > NotificationLogService.MAX_ENTRIES
        ? updated.slice(0, NotificationLogService.MAX_ENTRIES)
        : updated;
    });
  }

  markAllRead(): void {
    this.entries.update((current) => current.map((e) => ({ ...e, read: true })));
  }

  dismissEntry(entryId: number): void {
    this.entries.update((current) => current.filter((e) => e.id !== entryId));
  }

  clearAll(): void {
    this.entries.set([]);
  }
}
