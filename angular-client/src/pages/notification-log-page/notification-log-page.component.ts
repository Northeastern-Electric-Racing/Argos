import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  viewChild
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from 'src/components/typography/typography.component';
import { NotificationLogEntry, NotificationLogService } from 'src/services/notification-log.service';
import { UiButtonDirective, UiIconButtonDirective } from 'src/ui/button/button.directive';
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
  private injector = inject(Injector);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private emptyState = viewChild<ElementRef<HTMLElement>>('emptyState');
  protected entries = this.notificationLogService.notifications;
  protected hasEntries = computed(() => this.entries().length > 0);
  protected readonly columns = ['rule', 'topic', 'values', 'time', 'actions'];
  protected trackById = (_: number, entry: NotificationLogEntry) => entry.id;

  protected readonly t = tableClasses;
  protected readonly table = tableClass();
  protected readonly th = headerCellClass('phone');
  protected readonly thEnd = headerCellClass('phone', { align: 'right' });
  protected readonly td = cellClass('phone');
  /** Striped; `group/entry` lets the rule cell read the row's data-unread (accent dot, bolder id). */
  protected readonly row = cx(rowClass({ striped: true }), tw('group/entry'));
  protected readonly buttonIcon = iconClasses.sm;
  /** 36px, the nearest icon step to #909's 40px; decorative. */
  protected readonly emptyIcon = iconClasses.xl;

  /** Dismisses an entry; focus moves to the next row's dismiss button, else the row above, else the empty state. */
  protected dismiss(entry: NotificationLogEntry) {
    const entries = this.entries();
    const at = entries.indexOf(entry);
    const next = entries[at + 1] ?? entries[at - 1];
    this.notificationLogService.dismissEntry(entry.id);
    this.focusAfterRender(next);
  }

  /** Clears the log; focus moves to the empty state that replaces the table and its Clear All button. */
  protected clearAll() {
    this.notificationLogService.clearAll();
    this.focusAfterRender(undefined);
  }

  private focusAfterRender(entry: NotificationLogEntry | undefined) {
    afterNextRender(
      () => {
        const target = entry
          ? this.host.nativeElement.querySelector<HTMLElement>(`[data-entry="${entry.id}"]`)
          : this.emptyState()?.nativeElement;
        target?.focus();
      },
      { injector: this.injector }
    );
  }
}
