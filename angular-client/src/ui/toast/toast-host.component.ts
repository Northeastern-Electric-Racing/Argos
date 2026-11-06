import { afterRenderEffect, ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { UiIconButtonDirective } from '../button/button.directive';
import { tw } from '../recipes/tw';
import { ToastService, ToastSeverity } from './toast.service';

const ICONS: Record<ToastSeverity, string> = {
  success: 'check_circle',
  info: 'info',
  warn: 'warning',
  error: 'error'
};

const toastClasses = {
  /** Fixed top-right under the nav bar; clicks pass through the gaps between toasts. */
  stack: tw(
    'pointer-events-none fixed top-19 right-4 bottom-auto left-auto m-0 flex w-[min(24rem,calc(100vw-32px))] flex-col gap-2 overflow-visible border-0 bg-transparent p-0'
  ),
  /** The opaque surface under the severity tint, so the page never shows through. */
  toast: tw(
    'pointer-events-auto rounded-md bg-surface-2 text-fg shadow-overlay transition-[opacity,translate] duration-180 ease-out starting:translate-x-4 starting:opacity-0'
  )
};

/** Per severity: a 10% tint, a 45% edge and a solid 4px left bar in the status colour. */
const severityClasses: Record<ToastSeverity, string> = {
  success: tw(
    'flex items-start gap-3 rounded-md border border-l-4 border-solid border-success/45 border-l-success bg-success/10 py-3 pr-2 pl-4'
  ),
  info: tw(
    'flex items-start gap-3 rounded-md border border-l-4 border-solid border-info/45 border-l-info bg-info/10 py-3 pr-2 pl-4'
  ),
  warn: tw(
    'flex items-start gap-3 rounded-md border border-l-4 border-solid border-warn/45 border-l-warn bg-warn/10 py-3 pr-2 pl-4'
  ),
  error: tw(
    'flex items-start gap-3 rounded-md border border-l-4 border-solid border-danger/45 border-l-danger bg-danger/10 py-3 pr-2 pl-4'
  )
};

/** The severity icon's colour. */
const iconTone: Record<ToastSeverity, string> = {
  success: tw('shrink-0 text-success'),
  info: tw('shrink-0 text-info'),
  warn: tw('shrink-0 text-warn'),
  error: tw('shrink-0 text-danger')
};

/**
 * Renders the active toasts top-right. ToastService announces them to screen readers.
 * CDK 22 overlays (dialogs, drawers, popovers) live in the browser's top layer, so the stack is a
 * manual popover too, re-shown on each new toast so it stays above any open dialog.
 */
@Component({
  selector: 'ui-toast-host',
  templateUrl: './toast-host.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiIconComponent, UiIconButtonDirective]
})
export class ToastHostComponent {
  protected toastService = inject(ToastService);
  protected icons = ICONS;
  protected readonly classes = toastClasses;
  protected readonly severityClasses = severityClasses;
  protected readonly iconTone = iconTone;
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
