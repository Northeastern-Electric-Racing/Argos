import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { LoopStatus, NodeStatus } from '../../shutdown-loop.utils';
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

describe('LoopBannerComponent', () => {
  let fixture: ComponentFixture<LoopBannerComponent>;
  let el: HTMLElement;

  const render = (s: LoopStatus): string => {
    fixture.componentRef.setInput('status', s);
    fixture.detectChanges();
    return el.textContent!.replace(/\s+/g, ' ');
  };
  const live = () => el.querySelector<HTMLElement>('[aria-live="polite"]')!;
  const verdictText = () => el.querySelector<HTMLElement>('[data-verdict]')!.textContent!.replace(/\s+/g, ' ').trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoopBannerComponent] }).compileComponents();
    fixture = TestBed.createComponent(LoopBannerComponent);
    el = fixture.nativeElement;
  });

  describe('verdict', () => {
    it('names a single cause', () => {
      render(status({ verdict: 'open', suspects: [node('tsms')] }));
      expect(verdictText()).toBe('LOOP OPEN Cause: TSMS');
      expect(el.querySelector('[data-verdict]')!.getAttribute('data-verdict')).toBe('open');
    });

    it('lists several possible causes', () => {
      render(status({ verdict: 'open', suspects: [node('side-brb-r'), node('side-brb-l'), node('bms-latch')] }));
      expect(verdictText()).toBe('LOOP OPEN Cause is one of: Side BRB R Side BRB L BMS latch');
    });

    it('names no-data nodes inside the stretch', () => {
      render(
        status({ verdict: 'open', suspects: [node('em-interlock'), node('acc-sense')], noDataInStretch: [node('hvd')] })
      );
      expect(verdictText()).toBe('LOOP OPEN Cause is one of: Energy meter interlock Accumulator sense HVD · no data');
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

  describe('suspect buttons', () => {
    it('selects a suspect when its name is pressed', () => {
      const picked: (string | null)[] = [];
      fixture.componentInstance.nodeSelect.subscribe((id) => picked.push(id));
      render(status({ verdict: 'open', suspects: [node('side-brb-r'), node('bms-latch')] }));
      const buttons = el.querySelectorAll<HTMLButtonElement>('button[data-node-id]');
      expect(buttons.length).toBe(2);
      buttons[1].click();
      expect(picked).toEqual(['bms-latch']);
      expect(buttons[1].getAttribute('aria-label')).toBe('Show BMS latch');
    });
  });

  describe('announcement', () => {
    it('announces the verdict politely in one sentence', () => {
      render(status({ verdict: 'open', suspects: [node('tsms')] }));
      expect(live().getAttribute('role')).toBe('status');
      expect(live().textContent!.trim()).toBe('LOOP OPEN — cause: TSMS');
    });

    it('updates the announcement when the verdict changes, and only then', () => {
      render(status({ verdict: 'unknown', silentBoards: ['VCU', 'BMS'] }));
      expect(live().textContent!.trim()).toBe('UNKNOWN — no data from VCU and BMS');
      const textNode = live().firstChild;
      render(status({ verdict: 'unknown', silentBoards: ['VCU', 'BMS'] }));
      expect(live().firstChild).toBe(textNode);
      expect(live().textContent!.trim()).toBe('UNKNOWN — no data from VCU and BMS');
      render(status({ verdict: 'closed', airsEnergized: true }));
      expect(live().textContent!.trim()).toBe('LOOP CLOSED · AIRs on');
    });

    it('includes a mismatch in the announcement', () => {
      const mismatched: NodeStatus = { node: node('tsms'), state: 'downstream-open', mismatch: true };
      render(status({ verdict: 'open', suspects: [node('bots')], mismatch: true, nodes: [mismatched] }));
      expect(live().textContent!.trim()).toBe('LOOP OPEN — cause: BOTS. Sensor mismatch: TSMS read closed after the break.');
    });
  });

  describe('warnings', () => {
    it('shows a mismatch warning', () => {
      const mismatched: NodeStatus = { node: node('tsms'), state: 'downstream-open', mismatch: true };
      const text = render(status({ verdict: 'open', suspects: [node('bots')], mismatch: true, nodes: [mismatched] }));
      expect(text).toContain('Sensor mismatch: TSMS read closed after the break');
    });

    it('warns about a silent board while the loop is open', () => {
      const text = render(status({ verdict: 'open', suspects: [node('tsms')], silentBoards: ['BMS'] }));
      expect(text).toContain('No data from BMS for over 60 s');
    });

    it('does not repeat the silent boards under an UNKNOWN verdict', () => {
      const text = render(status({ verdict: 'unknown', silentBoards: ['BMS'] }));
      expect(text).not.toContain('for over 60 s');
    });
  });
});
