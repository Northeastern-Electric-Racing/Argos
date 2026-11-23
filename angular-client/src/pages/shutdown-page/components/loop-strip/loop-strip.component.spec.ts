import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NodeStatus } from '../../shutdown-loop.utils';
import { expectLoopViewContract, focusLoopNode } from '../../loop-view/loop-view.contract';
import { LoopStripComponent, USER_SCROLL_HOLD_MS } from './loop-strip.component';

/** TSMS is the cause; everything before it closed, after it downstream-open. */
const TSMS = SHUTDOWN_LOOP.findIndex((n) => n.id === 'tsms');
const NODES: NodeStatus[] = SHUTDOWN_LOOP.map((node, i) => {
  const state = i < TSMS ? 'closed' : i === TSMS ? 'suspect' : 'downstream-open';
  return { node, state, mismatch: false };
});
/** The break moved to the BMS latch, with the side BRBs (no sensor) in its stretch. */
const BMS = SHUTDOWN_LOOP.findIndex((n) => n.id === 'bms-latch');
const BMS_NODES: NodeStatus[] = SHUTDOWN_LOOP.map((node, i) => {
  const state = i === 0 ? 'closed' : i <= BMS ? 'suspect' : 'downstream-open';
  return { node, state, mismatch: false };
});

describe('LoopStripComponent', () => {
  let fixture: ComponentFixture<LoopStripComponent>;
  let el: HTMLElement;
  let selected: (string | null)[];
  let previewed: (string | null)[];
  const item = (id: string) => el.querySelector<HTMLElement>(`[data-node-id="${id}"]`)!;
  const render = (nodes: NodeStatus[]) => {
    fixture.componentRef.setInput('nodes', nodes);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoopStripComponent] }).compileComponents();
    fixture = TestBed.createComponent(LoopStripComponent);
    fixture.componentRef.setInput('nodes', NODES);
    selected = [];
    previewed = [];
    fixture.componentInstance.nodeSelect.subscribe((id) => selected.push(id));
    fixture.componentInstance.nodePreview.subscribe((id) => previewed.push(id));
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('renders one option per loop node in a horizontal listbox', () => {
    const listbox = el.querySelector('[role="listbox"]')!;
    expect(listbox.getAttribute('aria-orientation')).toBe('horizontal');
    expect(el.querySelectorAll('[role="option"][data-node-id]').length).toBe(19);
  });

  it('labels each loop node with its state in text, not colour alone', () => {
    expect(item('tsms').dataset['state']).toBe('suspect');
    expect(item('hvd').dataset['state']).toBe('downstream-open');
    expect(item('tsms').textContent).toContain('Cause');
    expect(item('hvd').textContent).toContain('Downstream');
    expect(item('tsms').getAttribute('aria-label')).toBe('TSMS: Open — cause');
  });

  it('draws the wire after the break as downstream, not as the cause', () => {
    const wire = (id: string) => item(id).querySelector<HTMLElement>('[data-wire]')!;
    expect(wire('cockpit-brb').dataset['wire']).toBe('closed');
    expect(wire('tsms').dataset['wire']).toBe('downstream-open');
    expect(wire('tsms').className).toContain('border-dashed');
    render(BMS_NODES);
    expect(wire('side-brb-r').dataset['wire']).toBe('suspect');
    expect(wire('side-brb-r').className).toContain('border-t-5');
    expect(wire('bms-latch').dataset['wire']).toBe('downstream-open');
  });

  it('brackets a single cause as the break and the downstream run as not the cause', () => {
    expect(item('tsms').dataset['zone']).toBe('stretch');
    expect(item('hvd').dataset['zone']).toBe('downstream');
    expect(item('cockpit-brb').dataset['zone']).toBeUndefined();
    expect(item('tsms').textContent).toContain('Broke the loop');
    expect(item('airs').textContent).toContain('Not the cause');
  });

  it('names a wider stretch from its start', () => {
    render(BMS_NODES);
    expect(item('side-brb-r').textContent).toContain('Suspect stretch');
    expect(el.textContent).not.toContain('Broke the loop');
  });

  it('tags the energy meter placeholder', () => {
    expect(item('em-interlock').textContent).toContain('placeholder');
    expect(item('em-interlock').textContent).toContain('no reading yet');
  });

  it('labels unmeasured loop nodes and draws them hollow', () => {
    expect(item('glvms').getAttribute('aria-label')).toMatch(/\(no sensor\)$/);
    expect(item('glvms').dataset['measured']).toBe('false');
    expect(item('tsms').getAttribute('aria-label')).not.toContain('no sensor');
    expect(item('tsms').dataset['measured']).toBe('true');
  });

  it('marks a mismatch with a warn ring, a badge and what it reads', () => {
    render(NODES.map((n) => (n.node.id === 'hvd' ? { ...n, value: 1, mismatch: true } : n)));
    expect(item('hvd').textContent).toContain('Reads 1');
    expect(item('hvd').querySelector('ui-icon[name="priority_high"], ui-icon')).toBeTruthy();
    expect(item('hvd').innerHTML).toContain('ring-warn');
    expect(item('hvd').getAttribute('aria-label')).toBe('HVD: reads closed after the break — sensor mismatch');
  });

  expectLoopViewContract(() => TestBed.createComponent(LoopStripComponent));

  describe('keyboard', () => {
    it('starts at the loop start, and walks the loop with arrows, Home and End', () => {
      expect(item('glvms').tabIndex).toBe(0);
      focusLoopNode(fixture, 'tsms');
      expect(document.activeElement).toBe(item('tsms'));
      for (const [k, to] of [
        ['End', 'airs'],
        ['Home', 'glvms']
      ]) {
        (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
        fixture.detectChanges();
        expect(document.activeElement).toBe(item(to));
      }
      expect(selected).toEqual([]);
    });

    it('previews the focused loop node without pinning it, and clears the preview when focus leaves', () => {
      focusLoopNode(fixture, 'side-brb-r');
      item('side-brb-r').blur();
      expect(previewed).toEqual(['glvms', 'side-brb-r', null]);
      expect(selected).toEqual([]);
    });
  });

  describe('scrolling', () => {
    /** A 300 px window onto a 19 × 72 px strip, as on a phone. */
    const stubLayout = (scrollLeft = 0) => {
      const scroller = el.firstElementChild as HTMLElement;
      Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: 19 * 72 });
      Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 300 });
      scroller.scrollLeft = scrollLeft;
      SHUTDOWN_LOOP.forEach((n, i) => {
        Object.defineProperty(item(n.id), 'offsetLeft', { configurable: true, value: i * 72 });
        Object.defineProperty(item(n.id), 'offsetWidth', { configurable: true, value: 72 });
      });
      return scroller;
    };
    const flush = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    };

    it('never scrolls on hover, nor when the pointer leaves', async () => {
      const scroller = stubLayout(100);
      fixture.componentRef.setInput('previewId', 'airs');
      await flush();
      expect(scroller.scrollLeft).toBe(100);
      fixture.componentRef.setInput('previewId', null);
      await flush();
      expect(scroller.scrollLeft).toBe(100);
    });

    it('scrolls to a loop node pinned from elsewhere (a banner chip), but not under the pointer', async () => {
      const scroller = stubLayout(0);
      fixture.componentRef.setInput('selectedId', 'airs');
      await flush();
      expect(scroller.scrollLeft).toBeGreaterThan(1000);
      scroller.scrollLeft = 0;
      scroller.dispatchEvent(new PointerEvent('pointerenter'));
      fixture.componentRef.setInput('selectedId', 'ts-plus');
      await flush();
      expect(scroller.scrollLeft).toBe(0);
    });

    it('follows the suspect stretch, unless the user scrolled the strip in the last 5 s', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      try {
        const scroller = stubLayout(0);
        render(NODES.map((n) => ({ ...n, state: n.node.id === 'airs' ? 'suspect' : 'closed' })));
        await flush();
        expect(scroller.scrollLeft).toBeGreaterThan(1000);
        scroller.dispatchEvent(new WheelEvent('wheel'));
        scroller.scrollLeft = 0;
        render(BMS_NODES.map((n, i) => (i > 14 ? { ...n, state: 'suspect' } : { ...n, state: 'closed' })));
        await flush();
        expect(scroller.scrollLeft).toBe(0);
        vi.setSystemTime(Date.now() + USER_SCROLL_HOLD_MS + 1);
        render(NODES.map((n) => ({ ...n, state: n.node.id === 'ts-plus' ? 'suspect' : 'closed' })));
        await flush();
        expect(scroller.scrollLeft).toBeGreaterThan(900);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
