import { Component, ChangeDetectionStrategy, ElementRef, computed, inject, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from 'src/components/typography/typography.component';
import { NotificationLogEntry, NotificationLogService } from 'src/services/notification-log.service';
import { UiButtonDirective, UiIconButtonDirective } from 'src/ui/button/button.directive';
import { injectFocusAfterRender } from 'src/ui/focus/focus-after-render';
import { iconClasses } from 'src/ui/recipes/icon';
import { cx, tw } from 'src/ui/recipes/tw';
import { cellClass, headerCellClass, rowClass, tableClass, tableClasses } from 'src/ui/recipes/table';

@Component({
  selector: 'notification-log-page',
  templateUrl: './notification-log-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkTableModule, DatePipe, MatIcon, TypographyComponent, UiButtonDirective, UiIconButtonDirective]
})
export default class NotificationLogPageComponent {
  protected notificationLogService = inject(NotificationLogService);
  private focusAfterRender = injectFocusAfterRender();
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private emptyState = viewChild<ElementRef<HTMLElement>>('emptyState');
  protected entries = this.notificationLogService.notifications;
  protected hasEntries = computed(() => this.entries().length > 0);
  protected readonly columns = ['rule', 'topic', 'values', 'time', 'actions'];
  protected trackById = (_: number, entry: NotificationLogEntry) => entry.id;

  protected readonly t = tableClasses;
  protected readonly table = tableClass();
  /** 814's log table: the caps header on an opaque surface-2 (it sticks), roomy cells, rows that tint on hover. */
  protected readonly th = headerCellClass('roomy', { tone: 'caps' });
  protected readonly thEnd = headerCellClass('roomy', { tone: 'caps', align: 'right' });
  protected readonly td = cellClass('roomy');
  /** Striped and tinted on hover; `group/entry` lets the rule cell read the row's data-unread (accent dot, bolder id). */
  protected readonly row = cx(rowClass({ striped: true, hover: 'tint' }), tw('group/entry'));
  protected readonly buttonIcon = iconClasses.sm;
  /** 36px, the nearest icon step to #909's 40px; decorative. */
  protected readonly emptyIcon = iconClasses.xl;

  /** Dismisses an entry; focus moves to the next row's dismiss button, else the row above, else the empty state. */
  protected dismiss(entry: NotificationLogEntry) {
    const entries = this.entries();
    const at = entries.indexOf(entry);
    const next = entries[at + 1] ?? entries[at - 1];
    this.notificationLogService.dismissEntry(entry.id);
    this.focusAfterRender(() =>
      next
        ? this.host.nativeElement.querySelector<HTMLElement>(`[data-entry="${next.id}"]`)
        : this.emptyState()?.nativeElement
    );
  }

  /** Clears the log; focus moves to the empty state that replaces the table and its Clear All button. */
  protected clearAll() {
    this.notificationLogService.clearAll();
    this.focusAfterRender(() => this.emptyState()?.nativeElement);
  }
}
