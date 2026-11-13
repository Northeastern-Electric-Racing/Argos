import { Injectable, inject } from '@angular/core';
import { take } from 'rxjs';
import { UiDialogService } from '../dialog/dialog.service';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

export interface ConfirmOptions {
  message: string;
  header?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  /** Style the accept button as destructive. */
  danger?: boolean;
  accept?: () => void;
  reject?: () => void;
}

let nextMessageId = 0;

/** Yes/no confirmation in an alert dialog; mirrors PrimeNG's ConfirmationService.confirm(). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private dialogService = inject(UiDialogService);

  confirm(options: ConfirmOptions): void {
    const messageId = `ui-confirm-message-${nextMessageId++}`;
    const ref = this.dialogService.open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      header: options.header ?? 'Confirm',
      width: '420px',
      role: 'alertdialog',
      ariaDescribedBy: messageId,
      data: {
        message: options.message,
        messageId,
        acceptLabel: options.acceptLabel ?? 'Yes',
        rejectLabel: options.rejectLabel ?? 'No',
        danger: options.danger ?? false
      }
    });
    ref.closed.pipe(take(1)).subscribe((accepted) => (accepted ? options.accept?.() : options.reject?.()));
  }
}
