import { Component, ChangeDetectionStrategy, ElementRef, computed, inject, input, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { NotificationLogEntry, NotificationLogService } from 'src/services/notification-log.service';
import { appRoutes } from 'src/app/app-routes';
import { UiButtonDirective } from 'src/ui/button/button.directive';
import { injectFocusAfterRender } from 'src/ui/focus/focus-after-render';

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
  private focusAfterRender = injectFocusAfterRender();
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private emptyState = viewChild<ElementRef<HTMLElement>>('emptyState');

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

  /**
   * Dismisses an entry; focus moves to the next entry's dismiss button, else the one above, else the empty state
   * (as on the notification log page). In the popover a dismiss can bring in the next older entry, which counts.
   */
  protected dismiss(entry: NotificationLogEntry): void {
    const entries = this.entries();
    const at = entries.indexOf(entry);
    this.notificationLogService.dismissEntry(entry.id);
    const next = this.entries()[at] ?? this.entries()[at - 1];
    this.focusAfterRender(() =>
      next
        ? this.host.nativeElement.querySelector<HTMLElement>(`[data-entry="${next.id}"]`)
        : this.emptyState()?.nativeElement
    );
  }

  /** Clears every entry; focus moves to the empty state that replaces the list and its Clear button. */
  protected clearAll(): void {
    this.notificationLogService.clearAll();
    this.focusAfterRender(() => this.emptyState()?.nativeElement);
  }

  viewAll(): void {
    this.notificationLogService.markAllRead();
    this.router.navigate([appRoutes.notificationLogRoute()]);
  }
}
