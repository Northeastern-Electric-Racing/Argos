import { inject } from '@angular/core';
import { TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';
import { filter, Observable } from 'rxjs';

/**
 * Returns a function that opens Taiga's confirm dialog and emits once when the user confirms
 * (cancelling or dismissing completes without emitting). Call it in an injection context.
 */
export function injectConfirm(): (label: string, data: TuiConfirmData) => Observable<true> {
  const dialogs = inject(TuiDialogService);
  return (label, data) =>
    dialogs.open<boolean>(TUI_CONFIRM, { label, size: 's', data }).pipe(filter((confirmed): confirmed is true => confirmed));
}
