import { DestroyRef, inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastComponent } from 'src/components/toast/toast.component';

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

export interface ToastMessage {
  severity: ToastSeverity;
  summary: string;
  detail?: string;
  /** How long the toast stays up, in milliseconds. */
  life?: number;
}

const DEFAULT_LIFE_MS = 3000;

/**
 * App-wide toasts on Material's snackbar. Keeps the `add({ severity, summary, detail })`
 * shape callers already use. A snackbar shows one message at a time and a new one would
 * replace it, so toasts raised while one is up wait their turn instead.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  /** The toast on screen, if any. */
  private showing?: ToastMessage;
  private queue: ToastMessage[] = [];

  add(message: ToastMessage): void {
    if (this.showing) {
      // A repeat of the toast on screen, or of one already waiting, adds nothing.
      const same = (m: ToastMessage) => m.summary === message.summary && m.detail === message.detail;
      if (!same(this.showing) && !this.queue.some(same)) this.queue.push(message);
      return;
    }
    this.show(message);
  }

  private show(message: ToastMessage): void {
    const ref = this.snackBar.openFromComponent(ToastComponent, {
      data: message,
      duration: message.life ?? DEFAULT_LIFE_MS,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      politeness: message.severity === 'error' ? 'assertive' : 'polite',
      panelClass: ['toast-panel', `toast-${message.severity}`]
    });
    this.showing = message;
    ref.afterDismissed().subscribe(() => {
      this.showing = undefined;
      const next = this.queue.shift();
      // Tearing down the app (or a test) dismisses the open toast; don't open queued ones then.
      if (next && !this.destroyRef.destroyed) this.show(next);
    });
  }
}
