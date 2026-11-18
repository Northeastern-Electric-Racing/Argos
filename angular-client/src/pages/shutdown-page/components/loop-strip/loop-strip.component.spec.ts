import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NodeStatus } from '../../shutdown-loop.utils';
import { LoopStripComponent } from './loop-strip.component';

/** TSMS is the cause; everything before it closed, after it downstream-open. */
const NODES: NodeStatus[] = SHUTDOWN_LOOP.map((node, i) => {
  const tsms = SHUTDOWN_LOOP.findIndex((n) => n.id === 'tsms');
  const state = i < tsms ? 'closed' : i === tsms ? 'suspect' : 'downstream-open';
  return { node, state, mismatch: false };
});

describe('LoopStripComponent', () => {
  let fixture: ComponentFixture<LoopStripComponent>;
  let el: HTMLElement;
  const item = (id: string) => el.querySelector<HTMLElement>(`[data-node-id="${id}"]`)!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoopStripComponent] }).compileComponents();
    fixture = TestBed.createComponent(LoopStripComponent);
    fixture.componentRef.setInput('nodes', NODES);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('renders one item per node', () => {
    expect(el.querySelectorAll('[data-node-id]').length).toBe(19);
  });

  it('marks suspects', () => {
    expect(item('tsms').classList).toContain('state-suspect');
    expect(item('hvd').classList).toContain('state-downstream');
    expect(item('tsms').textContent).toContain('Open — cause');
  });

  it('tags the energy meter placeholder', () => {
    expect(item('em-interlock').textContent).toContain('placeholder — no reading yet');
  });

  it('labels unmeasured nodes', () => {
    expect(item('glvms').getAttribute('aria-label')).toMatch(/\(no sensor\)$/);
    expect(item('tsms').getAttribute('aria-label')).not.toContain('no sensor');
  });
});
