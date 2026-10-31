import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from 'src/components/typography/typography.component';
import { NotificationLogEntry, NotificationLogService } from 'src/services/notification-log.service';

@Component({
  selector: 'notification-log-page',
  templateUrl: './notification-log-page.component.html',
  styleUrls: ['./notification-log-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkTableModule, DatePipe, MatIcon, TypographyComponent]
})
export default class NotificationLogPageComponent {
  protected notificationLogService = inject(NotificationLogService);
  protected entries = this.notificationLogService.notifications;
  protected hasEntries = computed(() => this.entries().length > 0);
  protected readonly columns = ['rule', 'topic', 'values', 'time', 'actions'];
  protected trackById = (_: number, entry: NotificationLogEntry) => entry.id;
}
