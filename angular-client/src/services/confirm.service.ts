import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  header: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  /** Styles the accept button as destructive (delete, clear, reset). */
  destructive?: boolean;
  accept: () => void;
  /**
   * Where focus goes if the control that asked is gone once the dialog closes, such as the delete
   * button of a row that `accept` removed. Without it, focus would fall back to the page body.
   */
  focusFallback?: () => HTMLElement | null | undefined;
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

  /** Questions asked while another is open or its dialog is still closing, shown in order. */
  private readonly queue: ConfirmOptions[] = [];
  private closing = false;

  confirm(options: ConfirmOptions): void {
    if (this._pending() || this.closing) this.queue.push(options);
    else this._pending.set(options);
  }

  /** Answers the pending question; only a yes runs its `accept`. */
  answer(accepted: boolean): void {
    const pending = this._pending();
    if (!pending) return;
    this._pending.set(null);
    this.closing = true;
    if (accepted) pending.accept();
  }

  /** Called by the dialog once it has finished closing, to show the next queued question. */
  closed(): void {
    this.closing = false;
    const next = this.queue.shift();
    if (next) this._pending.set(next);
  }
}
