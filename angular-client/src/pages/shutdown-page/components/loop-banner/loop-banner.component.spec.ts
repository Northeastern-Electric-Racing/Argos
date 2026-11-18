import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { LoopStatus, NodeStatus } from '../../shutdown-loop.utils';
import { LoopBannerComponent } from './loop-banner.component';

const node = (id: string) => SHUTDOWN_LOOP.find((n) => n.id === id)!;
const status = (overrides: Partial<LoopStatus>): LoopStatus => ({
  verdict: 'closed',
  nodes: [],
  suspects: [],
  silentBoards: [],
  mismatch: false,
  airsEnergized: false,
  ...overrides
});

describe('LoopBannerComponent', () => {
  let fixture: ComponentFixture<LoopBannerComponent>;

  const render = (s: LoopStatus, tsOn?: boolean): string => {
    fixture.componentRef.setInput('status', s);
    fixture.componentRef.setInput('tsOn', tsOn);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoopBannerComponent] }).compileComponents();
    fixture = TestBed.createComponent(LoopBannerComponent);
  });

  it('names a single cause', () => {
    expect(render(status({ verdict: 'open', suspects: [node('tsms')] }))).toContain('LOOP OPEN — cause: TSMS');
  });

  it('lists several possible causes', () => {
    const text = render(status({ verdict: 'open', suspects: [node('side-brb-r'), node('side-brb-l'), node('bms-latch')] }));
    expect(text).toContain('LOOP OPEN — cause is one of: Side BRB R, Side BRB L, BMS latch');
  });

  it('shows closed', () => {
    expect(render(status({ verdict: 'closed', airsEnergized: true }))).toContain('LOOP CLOSED · AIRs on');
  });

  it('shows unknown with silent boards', () => {
    expect(render(status({ verdict: 'unknown', silentBoards: ['VCU', 'BMS'] }))).toContain(
      'UNKNOWN — no data from VCU and BMS'
    );
  });

  it('shows mismatch warning', () => {
    const mismatched: NodeStatus = { node: node('tsms'), state: 'downstream-open', mismatch: true };
    const text = render(status({ verdict: 'open', suspects: [node('bots')], mismatch: true, nodes: [mismatched] }));
    expect(text).toContain('Sensor mismatch: TSMS read closed after the break');
  });

  it('shows TS chip states', () => {
    expect(render(status({}), true)).toContain('BMS: TS ON');
    expect(render(status({}), false)).toContain('BMS: TS OFF');
    expect(render(status({}), undefined)).toContain('BMS: TS —');
  });
});
