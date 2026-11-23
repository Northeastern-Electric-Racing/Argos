import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { LoopStatus, NodeStatus } from '../../shutdown-loop.utils';
import { LoopNodeDetailComponent } from './loop-node-detail.component';

const TSMS = SHUTDOWN_LOOP.findIndex((n) => n.id === 'tsms');
const NODES: NodeStatus[] = SHUTDOWN_LOOP.map((node, i) => ({
  node,
  state: i < TSMS ? 'closed' : i === TSMS ? 'suspect' : 'downstream-open',
  value: node.topic ? (i < TSMS ? 1 : 0) : undefined,
  ageMs: node.topic ? 3000 : undefined,
  mismatch: false
}));
const LOOP: LoopStatus = {
  verdict: 'open',
  nodes: NODES,
  suspects: [SHUTDOWN_LOOP[TSMS]],
  noDataInStretch: [],
  silentBoards: [],
  mismatch: false,
  airsEnergized: false
};

describe('LoopNodeDetailComponent', () => {
  let fixture: ComponentFixture<LoopNodeDetailComponent>;
  let el: HTMLElement;
  const text = () => el.textContent!.replace(/\s+/g, ' ');
  const field = (name: string) =>
    el.querySelector<HTMLElement>(`[data-field="${name}"]`)?.textContent?.replace(/\s+/g, ' ').trim();

  const show = (id: string | null, pinned: string | null = null) => {
    fixture.componentRef.setInput('nodeId', id);
    fixture.componentRef.setInput('pinnedId', pinned);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoopNodeDetailComponent] }).compileComponents();
    fixture = TestBed.createComponent(LoopNodeDetailComponent);
    fixture.componentRef.setInput('status', LOOP);
    el = fixture.nativeElement;
  });

  it('defaults to the break node', () => {
    show(null);
    expect(el.querySelector('h2')!.textContent).toContain('TSMS');
    expect(text()).toContain('Where the loop broke');
    expect(text()).toContain('the loop is broken here');
  });

  it('shows label, kind, topic, value, age and why', () => {
    show('hvd');
    expect(el.querySelector('h2')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('13 HVD');
    expect(field('state')).toBe('Open — after the break');
    expect(field('kind')).toBe('Interlock');
    expect(field('topic')).toBe('VCU/Shutdown/HVD_GPIO');
    expect(field('value')).toBe('0 (open)');
    expect(field('age')).toBe('3 s ago');
    expect(text()).toContain('Open because TSMS upstream is open. Not the cause.');
  });

  it('says when a loop node has no sensor and notes placeholders', () => {
    show('em-interlock');
    expect(field('topic')).toBe('No sensor');
    expect(field('value')).toBeUndefined();
    expect(text()).toContain('Placeholder: no reading yet');
  });

  it('offers to go back to the break while a loop node is pinned', () => {
    const unpinned: unknown[] = [];
    fixture.componentInstance.unpin.subscribe(() => unpinned.push(true));
    show('hvd', null);
    expect(el.querySelector('[data-unpin]')).toBeNull();
    show('hvd', 'hvd');
    expect(text()).toContain('Selected loop node');
    const button = el.querySelector<HTMLButtonElement>('button[data-unpin]')!;
    expect(button.getAttribute('aria-label')).toBe('Show the break');
    button.click();
    expect(unpinned).toEqual([true]);
  });

  it('adds the scylla note when the server’s state and this client’s reading disagree', () => {
    const nodes = NODES.map((n) => (n.node.id === 'tsms' ? { ...n, value: 1 } : n));
    fixture.componentRef.setInput('status', { ...LOOP, nodes, source: 'server' });
    show('tsms');
    expect(field('server-note')).toBe(
      "Decided by scylla-server, which sees every message; this client's latest reading is 1 (closed)."
    );
    expect(field('why')).toBe('Open while the reading before it is closed: the loop is broken here.');
    show('hvd');
    expect(field('server-note')).toBeUndefined();
  });

  it('prompts to pick a loop node and shows a key when the loop is closed and nothing is selected', () => {
    fixture.componentRef.setInput('status', { ...LOOP, verdict: 'closed', suspects: [] });
    show(null);
    expect(el.querySelector('h2')).toBeNull();
    expect(text()).toContain('Select a loop node');
    const legend = el.querySelector('[data-legend]')!;
    expect(legend.querySelectorAll('li').length).toBe(5);
    expect(legend.textContent).toContain('hollow: no sensor');
  });
});
