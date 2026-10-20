import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { NotificationLogService } from 'src/services/notification-log.service';
import { appRoutes } from 'src/app/app-routes';

export type NotificationListVariant = 'popover' | 'stream';

@Component({
  selector: 'notification-list',
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TuiButton, TuiIcon]
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
