import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import TypographyComponent from 'src/components/typography/typography.component';
import { NotificationLogService } from 'src/services/notification-log.service';

@Component({
  selector: 'notification-log-page',
  templateUrl: './notification-log-page.component.html',
  styleUrls: ['./notification-log-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzTableModule, DatePipe, NzButtonModule, NzIconModule, TypographyComponent]
})
export default class NotificationLogPageComponent {
  protected notificationLogService = inject(NotificationLogService);
  protected entries = this.notificationLogService.notifications;
  protected hasEntries = computed(() => this.entries().length > 0);
}
