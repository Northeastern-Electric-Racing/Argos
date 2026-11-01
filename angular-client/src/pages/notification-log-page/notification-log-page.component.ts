import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import TypographyComponent from 'src/components/typography/typography.component';
import { NotificationLogService } from 'src/services/notification-log.service';
import { topicBreakParts } from 'src/utils/topic.utils';

@Component({
  selector: 'notification-log-page',
  templateUrl: './notification-log-page.component.html',
  styleUrls: ['./notification-log-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableModule, DatePipe, Button, TypographyComponent]
})
export default class NotificationLogPageComponent {
  protected notificationLogService = inject(NotificationLogService);
  protected entries = this.notificationLogService.notifications;
  protected hasEntries = computed(() => this.entries().length > 0);
  protected readonly topicParts = topicBreakParts;

  // Phones get PrimeNG's small table density so Values stays in view next to Rule ID and Topic
  protected readonly compact = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 768px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false }
  );
}
