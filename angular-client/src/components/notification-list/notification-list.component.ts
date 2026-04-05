import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Button } from 'primeng/button';
import { NotificationLogService } from 'src/services/notification-log.service';
import { appRoutes } from 'src/app/app-routing.module';

export type NotificationListVariant = 'popover' | 'embedded' | 'stream';

@Component({
  selector: 'notification-list',
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, Button]
})
export class NotificationListComponent {
  protected notificationLogService = inject(NotificationLogService);
  private router = inject(Router);

  variant = input<NotificationListVariant>('popover');
  title = input<string>('Notifications');

  protected entries = computed(() =>
    this.variant() === 'stream'
      ? this.notificationLogService.notifications()
      : this.notificationLogService.recentNotifications()
  );
  protected hasEntries = computed(() => this.entries().length > 0);
  protected totalCount = computed(() => this.notificationLogService.notifications().length);

  viewAll(): void {
    this.notificationLogService.markAllRead();
    this.router.navigate([appRoutes.notificationLogRoute()]);
  }
}
