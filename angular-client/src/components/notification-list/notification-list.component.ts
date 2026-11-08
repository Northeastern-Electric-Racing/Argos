import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { NotificationLogService } from 'src/services/notification-log.service';
import { appRoutes } from 'src/app/app-routes';
import { UiButtonDirective } from 'src/ui/button/button.directive';

export type NotificationListVariant = 'popover' | 'stream';

@Component({
  selector: 'notification-list',
  templateUrl: './notification-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, UiIconComponent, UiButtonDirective]
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
  protected isPopover = computed(() => this.variant() === 'popover');
  protected hasEntries = computed(() => this.entries().length > 0);
  protected totalCount = computed(() => this.notificationLogService.notifications().length);

  viewAll(): void {
    this.notificationLogService.markAllRead();
    this.router.navigate([appRoutes.notificationLogRoute()]);
  }
}
