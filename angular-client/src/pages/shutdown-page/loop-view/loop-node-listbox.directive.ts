import { Listbox } from '@angular/aria/listbox';
import { DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';

/** The loop node id of the option an event came from (each option carries `data-node-id`). */
const nodeIdOf = (target: EventTarget | null): string | null =>
  target instanceof Element ? target.closest<HTMLElement>('[data-node-id]')?.dataset['nodeId'] ?? null : null;

/**
 * Bridges an Angular Aria listbox of loop nodes to LoopView's outputs (loop-view.ts, rule 3). Put it on the
 * `ngListbox` element (`selectionMode="explicit" orientation="horizontal" [wrap]="false"`, one
 * `ngOption [value]="id"` with `data-node-id` per loop node, `[value]` bound from `selectedId`):
 *
 * - the listbox's own selection changes (click, tap, Enter, Space toggle in explicit mode) emit `loopNodeSelect`;
 * - Escape emits `loopNodeSelect(null)`;
 * - the option the keyboard moves focus to emits `loopNodePreview`, and focus leaving the listbox emits null;
 * - hovering an option previews it; leaving it clears the preview, or, while the keyboard is driving and focus is
 *   still inside, goes back to the focused option, so a resting pointer never freezes keyboard reading.
 *
 * Focus alone never selects. Arrow keys, Home and End are Aria's (roving focus, one tab stop).
 */
@Directive({
  selector: '[ngListbox][loopNodeListbox]',
  host: {
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
    '(keydown)': 'onKeydown($event)',
    '(pointerdown)': 'keyboard = false'
  }
})
export class LoopNodeListboxDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly listbox = inject<Listbox<string>>(Listbox);

  readonly loopNodeSelect = output<string | null>();
  readonly loopNodePreview = output<string | null>();

  /** Whether the keyboard last moved within the listbox (a pointer press ends it). */
  protected keyboard = false;

  constructor() {
    // ModelSignal emits only the listbox's own changes, never the [value] binding coming back in.
    const sub = this.listbox.value.subscribe((value) => this.loopNodeSelect.emit(value[0] ?? null));
    // mouseenter / mouseleave do not bubble: catch them from the options on the way down.
    const enter = (e: Event) => this.onPointerEnter(e);
    const leave = (e: Event) => this.onPointerLeave(e);
    this.host.addEventListener('mouseenter', enter, true);
    this.host.addEventListener('mouseleave', leave, true);
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      this.host.removeEventListener('mouseenter', enter, true);
      this.host.removeEventListener('mouseleave', leave, true);
    });
  }

  protected onFocusIn(event: FocusEvent): void {
    const id = nodeIdOf(event.target);
    if (id) this.loopNodePreview.emit(id);
  }

  protected onFocusOut(event: FocusEvent): void {
    if (event.relatedTarget instanceof Node && this.host.contains(event.relatedTarget)) return;
    this.keyboard = false;
    this.loopNodePreview.emit(null);
  }

  protected onKeydown(event: KeyboardEvent): void {
    this.keyboard = true;
    if (event.key === 'Escape') this.loopNodeSelect.emit(null);
  }

  private onPointerEnter(event: Event): void {
    if (event.target === this.host) return;
    const id = nodeIdOf(event.target);
    if (id) this.loopNodePreview.emit(id);
  }

  private onPointerLeave(event: Event): void {
    if (event.target === this.host || !nodeIdOf(event.target)) return;
    const focused = this.host.contains(document.activeElement) ? nodeIdOf(document.activeElement) : null;
    this.loopNodePreview.emit(this.keyboard ? focused : null);
  }
}
