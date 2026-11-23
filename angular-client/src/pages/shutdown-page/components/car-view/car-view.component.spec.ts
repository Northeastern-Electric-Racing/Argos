import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NodeStatus } from '../../shutdown-loop.utils';
import { expectLoopViewContract } from '../../loop-view/loop-view.contract';
import { CarViewComponent } from './car-view.component';

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
  const callout = () => el.querySelector<HTMLElement>('[data-callout]')?.textContent?.replace(/\s+/g, ' ').trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CarViewComponent] }).compileComponents();
    fixture = TestBed.createComponent(CarViewComponent);
    fixture.componentRef.setInput('nodes', NODES);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('renders a marker per node and a wiring segment between each pair, coloured by the upstream node', () => {
    expect(el.querySelectorAll('[role="option"]').length).toBe(19);
    const segments = el.querySelectorAll<SVGLineElement>('line[data-state]');
    expect(segments.length).toBe(18);
    expect(segments[TSMS].dataset['state']).toBe('suspect');
    expect(segments[TSMS - 1].dataset['state']).toBe('closed');
    expect(segments[TSMS + 1].dataset['state']).toBe('downstream-open');
  });

  it('labels markers with their state', () => {
    expect(marker('tsms').getAttribute('aria-label')).toBe('TSMS: Open — cause');
    expect(marker('glvms').getAttribute('aria-label')).toBe('GLV master switch: Closed (no sensor)');
  });

  it('calls out the break node until another node is highlighted', () => {
    expect(callout()).toBe('12 · TSMS · Open — cause');
    fixture.componentRef.setInput('previewId', 'hvd');
    fixture.detectChanges();
    expect(callout()).toBe('13 · HVD · Open — after the break');
    expect(marker('hvd').dataset['highlighted']).toBe('true');
  });

  it('marks a mismatched marker, in its name and with a badge', () => {
    const mismatched = NODES.map((n) => (n.node.id === 'hvd' ? { ...n, value: 1, mismatch: true } : n));
    fixture.componentRef.setInput('nodes', mismatched);
    fixture.detectChanges();
    expect(marker('hvd').getAttribute('aria-label')).toBe('HVD: Open — after the break, mismatch');
    expect(marker('hvd').textContent).toContain('!');
    expect(marker('bots').textContent).not.toContain('!');
  });

  expectLoopViewContract(() => TestBed.createComponent(CarViewComponent));

  it('moves focus in loop order with arrow keys', () => {
    marker('tsms').focus();
    marker('tsms').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(marker('hvd'));
    marker('hvd').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(marker('glvms'));
  });
});
