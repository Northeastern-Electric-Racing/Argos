import { computed, Injectable, signal } from '@angular/core';

/**
 * Which shutdown node the Shutdown page is looking at, shared by every view of the loop so that pointing at a
 * node in one highlights it in the others. Provided by the page, so it resets when the page is left.
 *
 * View contract (the loop strip, the 2D car view, and any other view of the loop such as a 3D car):
 *   inputs   nodes: NodeStatus[]         every node in loop order (the view keeps its own `nodes` input as is)
 *            selectedId: string | null   the pinned node: aria-selected, and the keyboard's tab stop
 *            previewId: string | null    the node pointed at anywhere on the page; highlight previewId ?? selectedId
 *   outputs  nodeSelect: string | null   click, Enter/Space or keyboard focus on a node; null clears (Escape)
 *            nodePreview: string | null  pointer enters a node; null when it leaves
 * A view never owns selection: the page binds these to this store.
 */
@Injectable()
export class ShutdownSelectionStore {
  private readonly selected = signal<string | null>(null);
  private readonly previewed = signal<string | null>(null);

  readonly selectedId = this.selected.asReadonly();
  readonly previewId = this.previewed.asReadonly();
  /** The node to highlight and show in the detail panel: the one pointed at, else the selected one. */
  readonly activeId = computed(() => this.previewed() ?? this.selected());

  select(id: string | null): void {
    this.selected.set(id);
  }

  preview(id: string | null): void {
    this.previewed.set(id);
  }
}

/**
 * Roving focus through `count` nodes in loop order: arrows on either axis step to the next or previous node (the
 * car view is 2D, so up and down mean the same), Home and End jump to the ends. Undefined for any other key.
 */
export function rovingIndex(key: string, from: number, count: number): number | undefined {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return Math.min(from + 1, count - 1);
    case 'ArrowLeft':
    case 'ArrowUp':
      return Math.max(from - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return undefined;
  }
}
