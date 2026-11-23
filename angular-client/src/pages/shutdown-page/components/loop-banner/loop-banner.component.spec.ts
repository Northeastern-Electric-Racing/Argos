import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { LoopStatus, NodeState, NodeStatus } from '../../shutdown-loop.utils';
import { LoopBannerComponent } from './loop-banner.component';

const node = (id: string) => SHUTDOWN_LOOP.find((n) => n.id === id)!;
const status = (overrides: Partial<LoopStatus>): LoopStatus => ({
  verdict: 'closed',
  nodes: [],
  suspects: [],
  noDataInStretch: [],
  silentBoards: [],
  mismatch: false,
  airsEnergized: false,
  ...overrides
});
/** The whole loop, every loop node closed unless `states` says otherwise, with its LoopStatus summary. */
const loop = (states: Record<string, NodeState>, extra: Partial<LoopStatus> = {}): LoopStatus => {
  const nodes: NodeStatus[] = SHUTDOWN_LOOP.map((n) => ({
    node: n,
    state: states[n.id] ?? 'closed',
    value: n.topic ? (states[n.id] === 'suspect' ? 0 : 1) : undefined,
    ageMs: n.topic ? 1000 : undefined,
    mismatch: false
  }));
  const suspects = nodes.filter((s) => s.state === 'suspect').map((s) => s.node);
  return status({ verdict: suspects.length ? 'open' : 'closed', nodes, suspects, ...extra });
};
const breakAt = (id: string) => loop({ [id]: 'suspect' });

describe('LoopBannerComponent', () => {
  let fixture: ComponentFixture<LoopBannerComponent>;
  let el: HTMLElement;

  const render = (s: LoopStatus): string => {
    fixture.componentRef.setInput('status', s);
    fixture.detectChanges();
    return el.textContent!.replace(/\s+/g, ' ');
  };
  const live = () => el.querySelector<HTMLElement>('[aria-live="polite"]')!;
  const liveText = () => live().textContent!.trim();
  const verdictText = () => el.querySelector<HTMLElement>('[data-verdict]')!.textContent!.replace(/\s+/g, ' ').trim();
  const warnings = () => Array.from(el.querySelectorAll<HTMLElement>('[data-warning]')).map((w) => w.dataset['warning']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoopBannerComponent] }).compileComponents();
    fixture = TestBed.createComponent(LoopBannerComponent);
    el = fixture.nativeElement;
  });

  afterEach(() => vi.useRealTimers());

  describe('verdict', () => {
    it('names a single cause in the verdict line, as a button at the verdict size', () => {
      render(breakAt('tsms'));
      expect(el.querySelector('h2')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('LOOP OPEN · TSMS');
      expect(el.querySelector('h2 button[data-node-id="tsms"]')).toBeTruthy();
      expect(el.querySelector('[data-verdict]')!.getAttribute('data-verdict')).toBe('open');
    });

    it('lists several possible causes as chips in loop order, telling measured, unmeasured and no-data apart', () => {
      const s = loop({ 'side-brb-r': 'suspect', 'side-brb-l': 'suspect', 'bms-latch': 'suspect' }, { noDataInStretch: [] });
      render(s);
      expect(verdictText()).toBe(
        'LOOP OPEN Cause is one of: Side BRB R · no sensor Side BRB L · no sensor BMS latch · reads 0'
      );
      const kinds = Array.from(el.querySelectorAll<HTMLElement>('button[data-kind]')).map((b) => b.dataset['kind']);
      expect(kinds).toEqual(['unmeasured', 'unmeasured', 'measured']);
    });

    it('puts no-data loop nodes inside the stretch among the chips, in loop order, dashed', () => {
      const s = loop({ tsms: 'no-data', hvd: 'suspect' }, { noDataInStretch: [node('tsms')] });
      // computeLoopStatus lists suspects first; the chips follow the loop instead.
      render({ ...s, suspects: [node('hvd')] });
      const chips = Array.from(el.querySelectorAll<HTMLElement>('button[data-kind]'));
      expect(chips.map((b) => `${b.dataset['nodeId']}:${b.dataset['kind']}`)).toEqual(['tsms:no-data', 'hvd:measured']);
      expect(chips[0].className).toContain('border-dashed');
      expect(chips[1].className).toContain('border-solid');
      expect(chips[0].textContent!.replace(/\s+/g, ' ').trim()).toBe('TSMS · no data');
    });

    it('shows closed', () => {
      render(status({ verdict: 'closed', airsEnergized: true }));
      expect(verdictText()).toBe('LOOP CLOSED · AIRs on Every reading is live and closed.');
    });

    it('shows unknown with silent boards', () => {
      render(status({ verdict: 'unknown', silentBoards: ['VCU', 'BMS'] }));
      expect(verdictText()).toBe('UNKNOWN No data from VCU and BMS. Waiting for live readings.');
    });
  });

  describe('selecting from the banner', () => {
    it('selects the single culprit when its name is pressed', () => {
      const picked: (string | null)[] = [];
      fixture.componentInstance.nodeSelect.subscribe((id) => picked.push(id));
      render(breakAt('tsms'));
      el.querySelector<HTMLButtonElement>('button[data-node-id="tsms"]')!.click();
      expect(picked).toEqual(['tsms']);
    });

    it('selects a chip’s loop node', () => {
      const picked: (string | null)[] = [];
      fixture.componentInstance.nodeSelect.subscribe((id) => picked.push(id));
      render(loop({ 'side-brb-r': 'suspect', 'bms-latch': 'suspect' }));
      const buttons = el.querySelectorAll<HTMLButtonElement>('button[data-node-id]');
      expect(buttons.length).toBe(2);
      buttons[1].click();
      expect(picked).toEqual(['bms-latch']);
      expect(buttons[1].getAttribute('aria-label')).toBe('Show BMS latch, reads 0');
    });
  });

  describe('announcement', () => {
    it('announces the verdict and the break only, politely', () => {
      const s = breakAt('tsms');
      s.nodes[SHUTDOWN_LOOP.findIndex((n) => n.id === 'hvd')].mismatch = true;
      render({ ...s, mismatch: true });
      expect(live().getAttribute('role')).toBe('status');
      expect(liveText()).toBe('LOOP OPEN — cause: TSMS');
    });

    it('announces a stable change once it has held for 2 s', () => {
      vi.useFakeTimers();
      render(status({ verdict: 'unknown', silentBoards: ['VCU', 'BMS'] }));
      expect(liveText()).toBe('UNKNOWN — no data from VCU and BMS');
      render(breakAt('tsms'));
      vi.advanceTimersByTime(1900);
      fixture.detectChanges();
      expect(liveText()).toBe('UNKNOWN — no data from VCU and BMS');
      vi.advanceTimersByTime(200);
      fixture.detectChanges();
      expect(liveText()).toBe('LOOP OPEN — cause: TSMS');
    });

    it('announces at most twice while the break flaps every 300 ms for 10 s', () => {
      vi.useFakeTimers();
      render(breakAt('tsms'));
      const announced: string[] = [];
      let last = liveText();
      for (let t = 0; t < 10_000; t += 300) {
        render(breakAt(t % 600 === 0 ? 'bms-latch' : 'imd-latch'));
        vi.advanceTimersByTime(300);
        fixture.detectChanges();
        if (liveText() !== last) announced.push((last = liveText()));
      }
      expect(announced.length).toBeLessThanOrEqual(2);
    });

    it('waits 5 s between announcements, and the latest text wins', () => {
      vi.useFakeTimers();
      render(breakAt('tsms'));
      render(breakAt('hvd'));
      vi.advanceTimersByTime(2000);
      fixture.detectChanges();
      expect(liveText()).toBe('LOOP OPEN — cause: HVD');
      render(breakAt('bots'));
      vi.advanceTimersByTime(2000);
      render(breakAt('inertia'));
      vi.advanceTimersByTime(2000);
      fixture.detectChanges();
      expect(liveText()).toBe('LOOP OPEN — cause: HVD');
      vi.advanceTimersByTime(1000);
      fixture.detectChanges();
      expect(liveText()).toBe('LOOP OPEN — cause: Inertia switch');
    });
  });

  describe('warnings', () => {
    it('always renders the warning slot, at the same minimum height, with or without a warning', () => {
      render(breakAt('tsms'));
      const slot = () => el.querySelector<HTMLElement>('[data-warnings]')!;
      expect(slot().className).toContain('min-h-10');
      expect(warnings()).toEqual(['none']);
      expect(slot().textContent).toContain('No sensor warnings');
      const s = breakAt('tsms');
      s.nodes[SHUTDOWN_LOOP.findIndex((n) => n.id === 'hvd')].mismatch = true;
      render({ ...s, mismatch: true });
      expect(slot().className).toContain('min-h-10');
      expect(warnings()).toEqual(['mismatch']);
      for (const w of Array.from(slot().children)) expect(w.className).toContain('min-h-10');
    });

    it('shows a mismatch warning naming the loop node', () => {
      const s = breakAt('tsms');
      s.nodes[SHUTDOWN_LOOP.findIndex((n) => n.id === 'hvd')].mismatch = true;
      expect(render({ ...s, mismatch: true })).toContain('Sensor mismatch: HVD reads closed after the break');
    });

    it('names the silent loop nodes, never a duration, and says since the page opened when nothing came', () => {
      const s = loop({ tsms: 'suspect', 'acc-sense': 'no-data', 'tsip-sense': 'no-data' }, { silentBoards: ['BMS'] });
      s.nodes[SHUTDOWN_LOOP.findIndex((n) => n.id === 'tsip-sense')].ageMs = undefined;
      const text = render(s);
      expect(text).toContain(
        'No new reading from Accumulator sense; none since the page opened from TSIP sense: skipped, which can widen the suspect stretch.'
      );
      expect(text).not.toMatch(/over \d+ s|60 s/);
      expect(warnings()).toEqual(['silent']);
      const never = loop({ tsms: 'suspect', 'acc-sense': 'no-data' }, { silentBoards: ['BMS'] });
      never.nodes[SHUTDOWN_LOOP.findIndex((n) => n.id === 'acc-sense')].ageMs = undefined;
      expect(render(never)).toContain('No reading since the page opened from Accumulator sense');
    });

    it('sets mismatch and silent side by side in the one slot', () => {
      const s = loop({ tsms: 'suspect', 'acc-sense': 'no-data' }, { silentBoards: ['BMS'], mismatch: true });
      s.nodes[SHUTDOWN_LOOP.findIndex((n) => n.id === 'hvd')].mismatch = true;
      render(s);
      expect(warnings()).toEqual(['mismatch', 'silent']);
      expect(el.querySelector('[data-warnings]')!.className).toContain('flex-wrap');
    });

    it('does not repeat the silent boards under an UNKNOWN verdict', () => {
      render(loop({ 'acc-sense': 'no-data' }, { verdict: 'unknown', silentBoards: ['BMS'] }));
      expect(warnings()).toEqual(['none']);
    });

    it('flags an intermittent break once it has moved 3 times in 10 s, and clears after', () => {
      vi.useFakeTimers();
      render(breakAt('bms-latch'));
      for (const id of ['imd-latch', 'bspd-latch', 'bms-latch']) {
        vi.advanceTimersByTime(1000);
        render(breakAt(id));
      }
      expect(el.querySelector('[data-warning="intermittent"]')!.textContent!.replace(/\s+/g, ' ')).toContain(
        'Intermittent: the break moved 3× in 10 s between BMS latch, IMD latch and BSPD latch'
      );
      vi.advanceTimersByTime(10_000);
      render(breakAt('bms-latch'));
      expect(el.querySelector('[data-warning="intermittent"]')).toBeNull();
    });
  });
});
