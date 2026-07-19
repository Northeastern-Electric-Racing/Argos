import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
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
  /** Small header label shown above the pinned chips. */
  readonly title = input('Quick view');

  protected readonly collapsed = signal(false);

  protected toggle(): void {
    this.collapsed.update((collapsed) => !collapsed);
  }
}
