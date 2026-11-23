import { computed, Injectable, signal } from '@angular/core';

/**
 * Which loop node the Shutdown page is looking at, shared by every view of the loop (see LoopView in
 * loop-view/loop-view.ts) so that pointing at a loop node in one highlights it in the others. Provided by the page,
 * so it resets when the page is left. The page binds it once per view; no view owns selection.
 */
@Injectable()
export class ShutdownSelectionStore {
  private readonly selected = signal<string | null>(null);
  private readonly previewed = signal<string | null>(null);

  /** The pinned loop node. */
  readonly selectedId = this.selected.asReadonly();
  /** The loop node pointed at, or keyboard-active, anywhere on the page. */
  readonly previewId = this.previewed.asReadonly();
  /** previewId ?? selectedId: what every view highlights and loop-node-detail shows. */
  readonly activeId = computed(() => this.previewed() ?? this.selected());

  /** Sets the pin (null clears it) and clears the preview, so the chosen loop node shows at once. Idempotent. */
  select(id: string | null): void {
    this.selected.set(id);
    this.previewed.set(null);
  }

  preview(id: string | null): void {
    this.previewed.set(id);
  }
}
