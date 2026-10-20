import { inject, Injectable } from '@angular/core';
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
 * shape callers already use; a snackbar shows one message at a time, so a new toast
 * replaces the one on screen instead of stacking.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private snackBar = inject(MatSnackBar);

  add(message: ToastMessage): void {
    this.snackBar.openFromComponent(ToastComponent, {
      data: message,
      duration: message.life ?? DEFAULT_LIFE_MS,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      politeness: message.severity === 'error' ? 'assertive' : 'polite',
      panelClass: ['toast-panel', `toast-${message.severity}`]
    });
  }
}
