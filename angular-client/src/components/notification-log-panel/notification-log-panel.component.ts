import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Button } from 'primeng/button';
import { NotificationLogService } from 'src/services/notification-log.service';
import TypographyComponent from 'src/components/typography/typography.component';

@Component({
  selector: 'notification-log-panel',
  templateUrl: './notification-log-panel.component.html',
  styleUrls: ['./notification-log-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, Button, TypographyComponent]
})
export class NotificationLogPanelComponent {
  protected notificationLogService = inject(NotificationLogService);
}
