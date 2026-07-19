import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/**
 * Reusable read-only "quick view" status bar: a right-edge sidebar pop-out, top-aligned,
 * that surfaces pinned chips (projected via `<ng-content/>`). It auto-opens; a handle at the
 * top-right edge re-opens it after collapse, and it stays sticky while the page scrolls —
 * pinning to the top-right corner. Foundation for user-pinned, multi-chip status (see #709).
 */
@Component({
  selector: 'status-bar',
  templateUrl: './status-bar.component.html',
  styleUrl: './status-bar.component.css',
  imports: [MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class StatusBarComponent {
  private readonly injector = inject(Injector);

  /** Small header label shown above the pinned chips. */
  readonly title = input('Quick view');

  protected readonly collapsed = signal(false);

  private readonly handle = viewChild<ElementRef<HTMLButtonElement>>('handle');
  private readonly collapseButton = viewChild<ElementRef<HTMLButtonElement>>('collapseButton');

  protected toggle(): void {
    this.collapsed.update((collapsed) => !collapsed);
    // The @if/@else swaps which control is on screen, so move keyboard focus to the
    // successor — otherwise focus falls back to <body> and the focus-visible ring is lost.
    afterNextRender(
      () => {
        const target = this.collapsed() ? this.handle() : this.collapseButton();
        target?.nativeElement.focus();
      },
      { injector: this.injector }
    );
  }
}
