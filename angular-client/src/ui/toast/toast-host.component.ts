import { afterRenderEffect, ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { ToastService, ToastSeverity } from './toast.service';

const ICONS: Record<ToastSeverity, string> = {
  success: 'check_circle',
  info: 'info',
  warn: 'warning',
  error: 'error'
};

/**
 * Renders the active toasts top-right. ToastService announces them to screen readers.
 * CDK 22 overlays (dialogs, drawers, popovers) live in the browser's top layer, so the stack is a
 * manual popover too, re-shown on each new toast so it stays above any open dialog.
 */
@Component({
  selector: 'ui-toast-host',
  templateUrl: './toast-host.component.html',
  styleUrls: ['./toast-host.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon]
})
export class ToastHostComponent {
  protected toastService = inject(ToastService);
  protected icons = ICONS;
  private stack = viewChild.required<ElementRef<HTMLElement>>('stack');

  constructor() {
    afterRenderEffect({
      write: () => {
        const count = this.toastService.toasts().length;
        const el = this.stack().nativeElement;
        if (typeof el.showPopover !== 'function') return;
        if (el.matches(':popover-open')) el.hidePopover();
        if (count > 0) el.showPopover();
      }
    });
  }
}
