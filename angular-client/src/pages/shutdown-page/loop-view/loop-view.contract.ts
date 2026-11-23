import { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SHUTDOWN_LOOP } from '../shutdown-loop.model';
import { NodeStatus } from '../shutdown-loop.utils';
import { LoopView } from './loop-view';

/** The loop the contract runs on: TSMS is the single cause, closed before it, downstream-open after it. */
export const LOOP_VIEW_CONTRACT_NODES: NodeStatus[] = (() => {
  const tsms = SHUTDOWN_LOOP.findIndex((n) => n.id === 'tsms');
  return SHUTDOWN_LOOP.map((node, i) => {
    const state = i < tsms ? 'closed' : i === tsms ? 'suspect' : 'downstream-open';
    return {
      node,
      state,
      value: node.topic ? (i < tsms ? 1 : 0) : undefined,
      ageMs: node.topic ? 1000 : undefined,
      staleAfterMs: node.topic ? 5000 : undefined,
      mismatch: false
    };
  });
})();

type Fixture = ComponentFixture<LoopView>;

export interface LoopViewContractOptions {
  /**
   * The view draws each loop node as a DOM option (`role="option"` with `data-node-id`): the strip and the 2D car
   * when interactive. Default true. A 3D canvas view passes false: its keyboard access is the strip, so the
   * option checks (aria-selected, one tab stop, Escape, Enter/Space, focus) are skipped.
   */
  options?: boolean;
  /** Clicks or taps a loop node. Default: a click on its option. A 3D view passes its pick (or badge click). */
  click?: (fixture: Fixture, id: string) => void;
  /** Points at a loop node. Default: mouseenter on its option. */
  hover?: (fixture: Fixture, id: string) => void;
  /** Stops pointing at a loop node. Default: mouseleave on its option. */
  leave?: (fixture: Fixture, id: string) => void;
  /** Whether the view highlights a loop node. Default: its option has `data-highlighted="true"`. */
  highlighted?: (fixture: Fixture, id: string) => boolean;
}

type AnyFixture = ComponentFixture<unknown>;
const rootOf = (fixture: AnyFixture, root?: Element): Element => root ?? (fixture.nativeElement as HTMLElement);
const option = (fixture: AnyFixture, id: string, root?: Element): HTMLElement => {
  const el = rootOf(fixture, root).querySelector<HTMLElement>(`[role="option"][data-node-id="${id}"]`);
  if (!el) throw new Error(`No option for loop node ${id}`);
  return el;
};
const options = (fixture: AnyFixture, root?: Element): HTMLElement[] =>
  Array.from(rootOf(fixture, root).querySelectorAll<HTMLElement>('[role="option"][data-node-id]'));
const press = (fixture: AnyFixture, el: Element, k: string) => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  fixture.detectChanges();
};
/**
 * Moves keyboard focus to a loop node the way a user does: Tab lands on the view's tab stop (unless focus is
 * already inside), then arrows walk along the loop to it. Works for any roving-focus listbox. `root` narrows the
 * search to one view when the fixture holds several (a page).
 */
export function focusLoopNode(fixture: AnyFixture, id: string, root?: Element): HTMLElement {
  const all = options(fixture, root);
  const target = option(fixture, id, root);
  if (!all.includes(document.activeElement as HTMLElement)) all.find((o) => o.tabIndex === 0)?.focus();
  for (let step = 0; step < all.length && document.activeElement !== target; step++) {
    const at = all.indexOf(document.activeElement as HTMLElement);
    if (at < 0) break;
    press(fixture, all[at], at < all.indexOf(target) ? 'ArrowRight' : 'ArrowLeft');
  }
  if (document.activeElement !== target) throw new Error(`The keyboard cannot reach loop node ${id}`);
  return target;
}
const key = (fixture: Fixture, id: string, k: string) => press(fixture, focusLoopNode(fixture, id), k);

/**
 * Registers the LoopView contract's specs (loop-view.ts, rules 1-3) for a view. Call it inside the view's
 * `describe`, after the `beforeEach` that configures TestBed; `create` returns a fresh fixture of the view. The
 * helper sets `nodes`, `selectedId` and `previewId` itself and records `nodeSelect` and `nodePreview`.
 */
export function expectLoopViewContract(create: () => Fixture | Promise<Fixture>, opts: LoopViewContractOptions = {}): void {
  const domOptions = opts.options ?? true;
  const click = opts.click ?? ((f, id) => option(f, id).click());
  const hover = opts.hover ?? ((f, id) => option(f, id).dispatchEvent(new MouseEvent('mouseenter')));
  const leave = opts.leave ?? ((f, id) => option(f, id).dispatchEvent(new MouseEvent('mouseleave')));
  const highlighted =
    opts.highlighted ??
    (domOptions ? (f: Fixture, id: string) => option(f, id).dataset['highlighted'] === 'true' : undefined);

  async function setup() {
    const fixture = await create();
    const selected: (string | null)[] = [];
    const previewed: (string | null)[] = [];
    fixture.componentRef.setInput('nodes', LOOP_VIEW_CONTRACT_NODES);
    fixture.componentInstance.nodeSelect.subscribe((id) => selected.push(id));
    fixture.componentInstance.nodePreview.subscribe((id) => previewed.push(id));
    fixture.detectChanges();
    const set = (name: 'selectedId' | 'previewId', id: string | null) => {
      fixture.componentRef.setInput(name, id);
      fixture.detectChanges();
    };
    return { fixture, selected, previewed, set };
  }

  describe('LoopView contract', () => {
    it('emits nothing on load', async () => {
      const { fixture, selected, previewed } = await setup();
      await fixture.whenStable();
      expect(selected).toEqual([]);
      expect(previewed).toEqual([]);
    });

    it('toggles the pin on click: an id to pin, null when it is already pinned', async () => {
      const { fixture, selected, set } = await setup();
      click(fixture, 'bots');
      set('selectedId', 'bots');
      click(fixture, 'bots');
      click(fixture, 'hvd');
      expect(selected).toEqual(['bots', null, 'hvd']);
    });

    it('previews on hover and clears the preview on leave', async () => {
      const { fixture, selected, previewed } = await setup();
      hover(fixture, 'glvms');
      leave(fixture, 'glvms');
      expect(previewed).toEqual(['glvms', null]);
      expect(selected).toEqual([]);
    });

    if (highlighted) {
      it('highlights previewId ?? selectedId', async () => {
        const { fixture, set } = await setup();
        set('selectedId', 'bots');
        expect(highlighted(fixture, 'bots')).toBe(true);
        set('previewId', 'hvd');
        expect(highlighted(fixture, 'hvd')).toBe(true);
        expect(highlighted(fixture, 'bots')).toBe(false);
        set('previewId', null);
        expect(highlighted(fixture, 'bots')).toBe(true);
        expect(highlighted(fixture, 'hvd')).toBe(false);
      });
    }

    if (!domOptions) return;

    it('has one option per loop node, with aria-selected following selectedId', async () => {
      const { fixture, set } = await setup();
      expect(options(fixture).map((o) => o.dataset['nodeId'])).toEqual(LOOP_VIEW_CONTRACT_NODES.map((s) => s.node.id));
      expect(options(fixture).filter((o) => o.getAttribute('aria-selected') === 'true')).toEqual([]);
      set('selectedId', 'bots');
      expect(options(fixture).filter((o) => o.getAttribute('aria-selected') === 'true')).toEqual([option(fixture, 'bots')]);
      set('selectedId', null);
      expect(options(fixture).filter((o) => o.getAttribute('aria-selected') === 'true')).toEqual([]);
    });

    it('has exactly one tab stop, the pinned loop node when there is one', async () => {
      const { fixture, set } = await setup();
      expect(options(fixture).filter((o) => o.tabIndex === 0).length).toBe(1);
      set('selectedId', 'bots');
      expect(options(fixture).filter((o) => o.tabIndex === 0)).toEqual([option(fixture, 'bots')]);
    });

    it('toggles with Enter and Space, and clears with Escape', async () => {
      const { fixture, selected, set } = await setup();
      key(fixture, 'bots', 'Enter');
      set('selectedId', 'bots');
      key(fixture, 'bots', ' ');
      key(fixture, 'hvd', 'Escape');
      expect(selected).toEqual(['bots', null, null]);
    });

    it('never selects on focus alone: Tab in, arrow along and Tab out select nothing', async () => {
      const { fixture, selected, previewed } = await setup();
      focusLoopNode(fixture, 'hvd');
      (document.activeElement as HTMLElement).blur();
      fixture.detectChanges();
      expect(selected).toEqual([]);
      expect(previewed.at(-1)).toBeNull();
    });

    it('previews the loop node the keyboard moves to, over a resting pointer', async () => {
      const { fixture, previewed } = await setup();
      hover(fixture, 'tsms');
      focusLoopNode(fixture, 'bots');
      expect(previewed.at(-1)).toBe('bots');
      leave(fixture, 'tsms');
      expect(previewed.at(-1)).toBe('bots');
    });
  });
}
