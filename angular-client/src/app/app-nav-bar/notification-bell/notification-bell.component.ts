import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { NotificationListComponent } from 'src/components/notification-list/notification-list.component';
import { NotificationLogService } from 'src/services/notification-log.service';
import { UiPopoverComponent } from 'src/ui/popover/popover.component';
import { tw } from 'src/ui/recipes/tw';

const bellClasses = {
  /** White like the rest of the bar, red on hover. Its 32px icon is an `inline` mat-icon in a sized box. */
  bell: tw(
    'relative flex cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-2 text-inherit transition-colors duration-200 hover:text-accent-fg focus-visible:focus-ring'
  ),
  /** The unread badge: white on the strong accent (4.98:1), pinned to the bell's corner. */
  badge: tw(
    'absolute top-0.5 right-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-strong px-[0.3rem] font-sans text-badge font-semibold text-on-accent'
  )
};

/**
 * The nav bar's notification bell: the unread badge (hidden at 0) and the popover with the latest
 * notifications, which marks every entry read as it opens.
 */
@Component({
  selector: 'notification-bell',
  templateUrl: './notification-bell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon, NotificationListComponent, UiPopoverComponent]
})
export class NotificationBellComponent {
  protected notificationLogService = inject(NotificationLogService);
  protected readonly classes = bellClasses;
}
