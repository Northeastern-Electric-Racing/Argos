import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from 'src/components/confirm-dialog/confirm-dialog.component';

export interface ConfirmOptions extends ConfirmDialogData {
  /** Runs when the user accepts. */
  accept: () => void;
  /** Runs when the user cancels or dismisses the dialog. */
  reject?: () => void;
}

/** Yes/no confirmation dialogs on MatDialog. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private dialog = inject(MatDialog);

  confirm({ accept, reject, ...data }: ConfirmOptions): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data,
        width: '420px',
        role: 'alertdialog'
      })
      .afterClosed()
      // One-shot dialog result; take(1) ends the subscription.
      .pipe(take(1))
      .subscribe((accepted) => (accepted ? accept() : reject?.()));
  }
}
