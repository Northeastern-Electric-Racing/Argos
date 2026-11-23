import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Board, SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NodeStatus } from '../../shutdown-loop.utils';
import { LoopMetaComponent } from './loop-meta.component';

/** Every loop node closed, except the measured ones of `stale` boards, which logic has made no-data. */
const nodes = (vcuAge?: number, bmsAge?: number, stale: Board[] = []): NodeStatus[] =>
  SHUTDOWN_LOOP.map((node) => ({
    node,
    state: node.topic && node.board && stale.includes(node.board) ? 'no-data' : 'closed',
    mismatch: false,
    ageMs: node.board === 'VCU' ? vcuAge : node.board === 'BMS' ? bmsAge : undefined
  }));

describe('LoopMetaComponent', () => {
  let fixture: ComponentFixture<LoopMetaComponent>;
  let el: HTMLElement;

  const render = (n: NodeStatus[], tsOn?: boolean): string => {
    fixture.componentRef.setInput('nodes', n);
    fixture.componentRef.setInput('tsOn', tsOn);
    fixture.detectChanges();
    return el.textContent!.replace(/\s+/g, ' ');
  };
  const chip = (name: string) => el.querySelector<HTMLElement>(`[data-chip="${name}"]`)!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoopMetaComponent] }).compileComponents();
    fixture = TestBed.createComponent(LoopMetaComponent);
    el = fixture.nativeElement;
  });

  it('shows TS chip states in words', () => {
    render(nodes(), true);
    expect(chip('ts').textContent!.replace(/\s+/g, ' ')).toContain('BMS: TS ON');
    render(nodes(), false);
    expect(chip('ts').textContent!.replace(/\s+/g, ' ')).toContain('BMS: TS OFF');
    render(nodes(), undefined);
    expect(chip('ts').textContent!.replace(/\s+/g, ' ')).toContain('BMS: TS —');
  });

  it('shows when each board last updated', () => {
    const text = render(nodes(1200, 4000));
    expect(text).toContain('VCU 1 s ago');
    expect(text).toContain('BMS 4 s ago');
    expect(chip('VCU').dataset['stale']).toBe('false');
  });

  it('flags boards whose readings logic calls stale, never judging an age itself', () => {
    expect(render(nodes(75_000, 1000))).not.toContain('stale');
    const text = render(nodes(75_000, undefined, ['VCU', 'BMS']));
    expect(text).toContain('VCU 1 min 15 s ago · stale');
    expect(text).toContain('BMS never');
    expect(chip('VCU').dataset['stale']).toBe('true');
    expect(chip('BMS').dataset['stale']).toBe('true');
  });
});
