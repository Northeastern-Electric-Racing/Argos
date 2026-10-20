import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBellOff, lucideTrash2, lucideX } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmTableImports } from '@spartan-ng/helm/table';
import TypographyComponent from 'src/components/typography/typography.component';
import { NotificationLogService } from 'src/services/notification-log.service';

@Component({
  selector: 'notification-log-page',
  templateUrl: './notification-log-page.component.html',
  styleUrls: ['./notification-log-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmTableImports, DatePipe, HlmButton, NgIcon, TypographyComponent],
  providers: [provideIcons({ lucideBellOff, lucideTrash2, lucideX })]
})
export default class NotificationLogPageComponent {
  protected notificationLogService = inject(NotificationLogService);
  protected entries = this.notificationLogService.notifications;
  protected hasEntries = computed(() => this.entries().length > 0);
}
