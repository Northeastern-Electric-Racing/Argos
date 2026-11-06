import { ChangeDetectionStrategy, Component, ElementRef, input, signal, viewChild } from '@angular/core';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { injectFocusAfterRender } from 'src/ui/focus/focus-after-render';
import { cx, tw } from 'src/ui/recipes/tw';

/** Both surfaces dock flush to the top-right edge. */
const docked = tw('absolute top-0 right-0 border border-r-0 border-border bg-panel');

/**
 * Reusable read-only "quick view" status bar: a right-edge sidebar pop-out, top-aligned,
 * that surfaces pinned chips (projected via `<ng-content/>`). It auto-opens; a handle at the
 * top-right edge re-opens it after collapse, and it stays sticky while the page scrolls —
 * pinning to the top-right corner. Foundation for user-pinned, multi-chip status (see #709).
 */
@Component({
  selector: 'status-bar',
  templateUrl: './status-bar.component.html',
  imports: [UiIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // A block host, so the sticky bar's containing block spans the whole page.
  host: { class: 'sticky top-0 z-20 block' }
})
export default class StatusBarComponent {
  /**
   * preventScroll: moving focus into a passive status surface must never move the page. It also guards the fade-in:
   * an earlier version translated the panel past the right edge, and a scrolling focus() chased it, dragging the
   * whole page sideways for the animation. The moved focus shows a ring only after a key press.
   */
  private readonly focusAfterRender = injectFocusAfterRender({ preventScroll: true });

  protected readonly handleClass = cx(
    docked,
    tw(
      'inline-flex h-14 w-7.5 cursor-pointer items-center justify-center rounded-l-[12px] p-0 text-fg hover:bg-fg/8 focus-visible:focus-ring focus-visible:-outline-offset-2'
    )
  );
  /**
   * The panel fades in where it docks (from @starting-style) rather than sliding in from off-screen: a box moved
   * past the edge would add scrollable overflow to the page and give focus() somewhere to scroll to, which
   * shifted the whole page sideways for the length of the animation.
   */
  protected readonly panelClass = cx(
    docked,
    tw(
      'flex flex-col items-start gap-2.5 rounded-l-[12px] px-3 pt-2.5 pb-3.5 shadow-overlay transition-opacity duration-200 starting:opacity-0'
    )
  );
  protected readonly collapseClass = tw(
    'inline-flex size-7 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-fg-label hover:bg-fg/8 focus-visible:focus-ring'
  );

  /** Small header label shown above the pinned chips. */
  readonly title = input('Quick view');

  protected readonly collapsed = signal(false);

  private readonly handle = viewChild<ElementRef<HTMLButtonElement>>('handle');
  private readonly collapseButton = viewChild<ElementRef<HTMLButtonElement>>('collapseButton');

  protected toggle(): void {
    this.collapsed.update((collapsed) => !collapsed);
    // The @if/@else swaps which control is on screen, so move keyboard focus to the
    // successor — otherwise focus falls back to <body> and the focus-visible ring is lost.
    this.focusAfterRender(() => (this.collapsed() ? this.handle() : this.collapseButton())?.nativeElement);
  }
}
