import { Injectable, signal } from '@angular/core';

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

export interface ToastMessage {
  severity?: ToastSeverity;
  summary?: string;
  detail?: string;
  /** Milliseconds before the toast hides itself. Default 3000. */
  life?: number;
  /** Keep the toast until the user closes it. */
  sticky?: boolean;
}

export interface ActiveToast extends ToastMessage {
  id: number;
  severity: ToastSeverity;
}

const DEFAULT_LIFE_MS = 3000;

/**
 * App-wide toasts. Neither Angular Aria nor the CDK has a toast, so this is our own:
 * a signal of active messages rendered by `<ui-toast-host>` in an ARIA live region.
 * `add()` mirrors PrimeNG's MessageService.add so call sites stay the same.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly toasts = signal<ActiveToast[]>([]);

  add(message: ToastMessage): void {
    const toast: ActiveToast = { ...message, id: this.nextId++, severity: message.severity ?? 'info' };
    this.toasts.update((list) => [...list, toast]);
    if (!message.sticky) {
      this.timers.set(
        toast.id,
        setTimeout(() => this.remove(toast.id), message.life ?? DEFAULT_LIFE_MS)
      );
    }
  }

  remove(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.toasts.set([]);
  }
}
