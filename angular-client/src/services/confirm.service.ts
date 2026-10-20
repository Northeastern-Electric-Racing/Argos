import { inject, Injectable } from '@angular/core';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { take } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogContext } from 'src/components/confirm-dialog/confirm-dialog.component';

export interface ConfirmOptions extends ConfirmDialogContext {
  accept: () => void;
}

/**
 * Asks the user to confirm an action in a Spartan alert dialog, running `accept` only on yes.
 * Spartan has no confirmation service, so this wraps HlmDialogService the way PrimeNG's ConfirmationService did.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private dialogService = inject(HlmDialogService);

  confirm({ accept, ...context }: ConfirmOptions): void {
    const ref = this.dialogService.open<boolean, ConfirmDialogContext>(ConfirmDialogComponent, {
      context,
      role: 'alertdialog',
      showCloseButton: false,
      closeOnOutsidePointerEvents: false
    });
    ref.closed$.pipe(take(1)).subscribe((accepted) => {
      if (accepted) accept();
    });
  }
}
