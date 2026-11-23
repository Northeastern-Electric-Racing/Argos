import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NodeStatus } from '../../shutdown-loop.utils';
import { expectLoopViewContract } from '../../loop-view/loop-view.contract';
import { CarViewComponent } from './car-view.component';
import { CAR_BADGE_2D } from './car-view.layout';

const TSMS = SHUTDOWN_LOOP.findIndex((n) => n.id === 'tsms');
const NODES: NodeStatus[] = SHUTDOWN_LOOP.map((node, i) => ({
  node,
  state: i < TSMS ? 'closed' : i === TSMS ? 'suspect' : 'downstream-open',
  value: node.topic ? (i < TSMS ? 1 : 0) : undefined,
  ageMs: node.topic ? 3000 : undefined,
  mismatch: false
}));

describe('CarViewComponent', () => {
  let el: HTMLElement;
  let fixture: ComponentFixture<CarViewComponent>;
  const marker = (id: string) => el.querySelector<HTMLElement>(`[role="option"][data-node-id="${id}"]`)!;
  const callout = () => el.querySelector<HTMLElement>('[data-callout]');
  const calloutText = () => callout()?.textContent?.replace(/\s+/g, ' ').trim();
  const set = (name: string, value: unknown) => {
    fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CarViewComponent] }).compileComponents();
    fixture = TestBed.createComponent(CarViewComponent);
    fixture.componentRef.setInput('nodes', NODES);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  expectLoopViewContract(() => TestBed.createComponent(CarViewComponent));

  describe('interactive (sm and up)', () => {
    it('renders a badge per loop node at its CAR_BADGE_2D spot, with an anchor dot where the part is', () => {
      expect(el.querySelectorAll('[role="option"]').length).toBe(19);
      expect(el.querySelectorAll('[data-anchor]').length).toBe(19);
      expect(marker('tsms').style.left).toBe(`${CAR_BADGE_2D['tsms'].x}%`);
      expect(marker('bots').style.left).toBe(`${SHUTDOWN_LOOP.find((n) => n.id === 'bots')!.car.x}%`);
    });

    it('joins each fanned badge to its anchor with a leader line', () => {
      const fanned = SHUTDOWN_LOOP.filter((n) => {
        const b = CAR_BADGE_2D[n.id];
        return Math.hypot(b.x - n.car.x, b.y - n.car.y) > 0.5;
      });
      expect(fanned.length).toBeGreaterThan(10);
      expect(el.querySelectorAll('line[data-leader]').length).toBe(fanned.length);
    });

    it('shows the glyph on every badge, and no scale on hover', () => {
      for (const n of SHUTDOWN_LOOP) expect(marker(n.id).querySelector('status-glyph')).toBeTruthy();
      expect(marker('tsms').className).not.toContain('scale');
    });

    it('draws each wire by segmentState, the wire after the break downstream, the cause heavy over a casing', () => {
      const wires = el.querySelectorAll<SVGLineElement>('line[data-state]');
      expect(wires.length).toBe(18);
      expect(wires[TSMS - 1].dataset['state']).toBe('closed');
      expect(wires[TSMS].dataset['state']).toBe('downstream-open');
      expect(wires[TSMS].getAttribute('stroke-dasharray')).toBeTruthy();
      expect(wires[TSMS - 1].getAttribute('stroke-width')).toBe('3');
      const wide = NODES.map((n, i) => (i > 0 && i <= 3 ? { ...n, state: 'suspect' as const } : n));
      set('nodes', wide);
      const now = el.querySelectorAll<SVGLineElement>('line[data-state]');
      expect(now[1].dataset['state']).toBe('suspect');
      expect(now[1].getAttribute('stroke-width')).toBe('5');
      expect(el.querySelectorAll('line.stroke-page').length).toBeGreaterThan(0);
    });

    it('greys the frame drawing out', () => {
      expect(el.querySelector('img')!.className).toContain('grayscale');
    });

    it('labels badges with their state', () => {
      expect(marker('tsms').getAttribute('aria-label')).toBe('TSMS: Open — cause');
      expect(marker('glvms').getAttribute('aria-label')).toBe('GLV master switch: Closed (no sensor)');
    });

    it('pings the break a few times, never catching the pointer', () => {
      const ping = marker('tsms').querySelector<HTMLElement>('[class*="animate-"]')!;
      expect(ping.className).toContain('pointer-events-none');
      expect(ping.className).toMatch(/_3\]/);
      expect(marker('hvd').querySelector('[class*="animate-"]')).toBeNull();
    });

    it('marks a mismatched badge with a warn ring and badge, and in its name', () => {
      set(
        'nodes',
        NODES.map((n) => (n.node.id === 'hvd' ? { ...n, value: 1, mismatch: true } : n))
      );
      expect(marker('hvd').getAttribute('aria-label')).toBe('HVD: reads closed after the break — sensor mismatch');
      expect(marker('hvd').innerHTML).toContain('border-warn');
      expect(marker('hvd').textContent).toContain('priority_high');
      expect(marker('bots').textContent).not.toContain('priority_high');
    });
  });

  describe('callout', () => {
    it('shows only for the highlighted loop node, not the break by default', () => {
      expect(callout()).toBeNull();
      set('previewId', 'hvd');
      expect(calloutText()).toBe('13 · HVD · Open — after the break');
      set('previewId', null);
      set('selectedId', 'tsms');
      expect(calloutText()).toBe('12 · TSMS · Open — cause');
    });

    it('aligns to the edge it is near, and drops below a loop node near the top', () => {
      set('selectedId', 'bots');
      expect(callout()!.dataset['align']).toBe('start');
      set('selectedId', 'mc-hvil');
      expect(callout()!.dataset['align']).toBe('end');
      set('selectedId', 'hvd');
      expect(callout()!.dataset['align']).toBe('center');
      expect(callout()!.dataset['side']).toBe('above');
      set('selectedId', 'side-brb-r');
      expect(callout()!.dataset['side']).toBe('below');
      expect(callout()!.className).toContain('whitespace-normal');
      expect(callout()!.className).toContain('max-w-64');
    });
  });

  describe('overview (below sm)', () => {
    beforeEach(() => set('interactive', false));

    it('is an image named with the loop summary, with no options or tab stops', () => {
      const img = el.querySelector('[role="img"]')!;
      expect(img.getAttribute('aria-label')).toBe('LOOP OPEN — cause: TSMS');
      expect(el.querySelector('[role="option"]')).toBeNull();
      expect(el.querySelector('[role="listbox"]')).toBeNull();
      expect(el.querySelector('[tabindex]')).toBeNull();
    });

    it('draws the break as a disc with its glyph and every other loop node as a dot, suspects ringed', () => {
      const discs = el.querySelectorAll<HTMLElement>('[data-overview="disc"]');
      expect(Array.from(discs).map((d) => d.dataset['nodeId'])).toEqual(['tsms']);
      expect(discs[0].querySelector('status-glyph')).toBeTruthy();
      expect(el.querySelectorAll('[data-overview="dot"]').length).toBe(18);
      set('previewId', 'hvd');
      const tsms = el.querySelector<HTMLElement>('[data-overview][data-node-id="tsms"]')!;
      expect(tsms.dataset['overview']).toBe('dot');
      expect(tsms.className).toContain('ring-danger');
      expect(el.querySelector<HTMLElement>('[data-overview="disc"]')!.dataset['nodeId']).toBe('hvd');
    });

    it('takes no pointer events', () => {
      for (const m of Array.from(el.querySelectorAll<HTMLElement>('[data-overview]'))) {
        expect(m.className).toContain('pointer-events-none');
      }
    });
  });
});
