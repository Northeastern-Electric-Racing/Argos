import { Directive, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Popover } from 'primeng/popover';

const FIELD_SELECTOR =
  'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard focus for a PrimeNG Popover, which is appended to <body> and so sits outside the page's tab order:
 * on show, focus moves to the popover's first field; on hide, it returns to the trigger.
 * PrimeNG's own focusOnShow is turned off: it focuses the first [autofocus], and PrimeNG 21 puts that attribute
 * on every Button and input, so it would land on an arbitrary control.
 */
@Directive({ selector: 'p-popover[argosPopoverFocus]' })
export class PopoverFocusDirective {
  private readonly popover = inject(Popover);
  private trigger: HTMLElement | null = null;

  constructor() {
    this.popover.focusOnShow = false;
    this.popover.onShow.pipe(takeUntilDestroyed()).subscribe(() => this.onShow());
    this.popover.onHide.pipe(takeUntilDestroyed()).subscribe(() => this.onHide());
  }

  private onShow(): void {
    // PrimeNG clears its target before onHide, so keep the trigger now
    const { target, container } = this.popover;
    this.trigger = target instanceof HTMLElement ? target : null;
    // The content is rendered as the show animation starts; focus once it is in place
    setTimeout(() => container?.querySelector<HTMLElement>(FIELD_SELECTOR)?.focus());
  }

  private onHide(): void {
    // onHide fires before the overlay leaves the page; only pull focus back if it is in there (or already lost),
    // so a click elsewhere keeps its own focus
    const active = document.activeElement;
    const focusInside = !active || active === document.body || !!this.popover.container?.contains(active);
    if (this.trigger?.isConnected && focusInside) {
      this.trigger.focus({ preventScroll: true });
    }
    this.trigger = null;
  }
}
