import { inject, Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
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
  private current?: MatSnackBarRef<ToastComponent>;
  private queue: ToastMessage[] = [];

  add(message: ToastMessage): void {
    if (this.current) {
      // A repeat of a toast that's already waiting adds nothing.
      const queued = this.queue.some((m) => m.summary === message.summary && m.detail === message.detail);
      if (!queued) this.queue.push(message);
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
    this.current = ref;
    ref.afterDismissed().subscribe(() => {
      this.current = undefined;
      const next = this.queue.shift();
      if (next) this.show(next);
    });
  }
}
