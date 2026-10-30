import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  header: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  /** Styles the accept button as destructive (delete, clear, reset). */
  destructive?: boolean;
  accept: () => void;
}

/**
 * Asks the user to confirm an action, running `accept` only on yes. The question is shown by the
 * app-wide ConfirmDialogComponent, which renders Spartan's Alert Dialog. Spartan's Alert Dialog is
 * declared in templates, so this service only holds the pending question for it, the way PrimeNG's
 * ConfirmationService fed its single confirm dialog.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly _pending = signal<ConfirmOptions | null>(null);
  /** The question waiting for an answer, or null when none is open. */
  readonly pending = this._pending.asReadonly();

  confirm(options: ConfirmOptions): void {
    this._pending.set(options);
  }

  /** Answers the pending question; only a yes runs its `accept`. */
  answer(accepted: boolean): void {
    const pending = this._pending();
    this._pending.set(null);
    if (accepted) pending?.accept();
  }
}
