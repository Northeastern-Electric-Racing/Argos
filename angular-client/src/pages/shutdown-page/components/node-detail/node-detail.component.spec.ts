import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { LoopStatus, NodeStatus } from '../../shutdown-loop.utils';
import { NodeDetailComponent } from './node-detail.component';

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

describe('NodeDetailComponent', () => {
  let fixture: ComponentFixture<NodeDetailComponent>;
  let el: HTMLElement;
  const text = () => el.textContent!.replace(/\s+/g, ' ');
  const field = (name: string) =>
    el.querySelector<HTMLElement>(`[data-field="${name}"]`)?.textContent?.replace(/\s+/g, ' ').trim();

  const show = (id: string | null) => {
    fixture.componentRef.setInput('nodeId', id);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NodeDetailComponent] }).compileComponents();
    fixture = TestBed.createComponent(NodeDetailComponent);
    fixture.componentRef.setInput('status', LOOP);
    el = fixture.nativeElement;
  });

  it('defaults to the break node', () => {
    show(null);
    expect(el.querySelector('h2')!.textContent).toContain('TSMS');
    expect(text()).toContain('the loop is broken here');
  });

  it('shows label, kind, topic, value, age and why', () => {
    show('hvd');
    expect(el.querySelector('h2')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('13 HVD');
    expect(field('state')).toBe('Open — upstream');
    expect(field('kind')).toBe('Interlock');
    expect(field('topic')).toBe('VCU/Shutdown/HVD_GPIO');
    expect(field('value')).toBe('0 (open)');
    expect(field('age')).toBe('3 s ago');
    expect(text()).toContain('Open because TSMS upstream is open. Not the cause.');
  });

  it('says when a node has no sensor and notes placeholders', () => {
    show('em-interlock');
    expect(field('topic')).toBe('No sensor');
    expect(field('value')).toBeUndefined();
    expect(text()).toContain('Placeholder: no reading yet');
  });

  it('prompts to pick a node when the loop is closed and nothing is selected', () => {
    fixture.componentRef.setInput('status', { ...LOOP, verdict: 'closed', suspects: [] });
    show(null);
    expect(el.querySelector('h2')).toBeNull();
    expect(text()).toContain('Select a node');
  });
});
