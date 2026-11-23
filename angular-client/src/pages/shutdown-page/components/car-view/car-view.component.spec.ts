import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SHUTDOWN_LOOP } from '../../shutdown-loop.model';
import { NodeStatus } from '../../shutdown-loop.utils';
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
  let selected: (string | null)[];
  let previewed: (string | null)[];
  const marker = (id: string) => el.querySelector<HTMLElement>(`[role="option"][data-node-id="${id}"]`)!;
  const callout = () => el.querySelector<HTMLElement>('[data-callout]')?.textContent?.replace(/\s+/g, ' ').trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CarViewComponent] }).compileComponents();
    fixture = TestBed.createComponent(CarViewComponent);
    fixture.componentRef.setInput('nodes', NODES);
    selected = [];
    previewed = [];
    fixture.componentInstance.nodeSelect.subscribe((id) => selected.push(id));
    fixture.componentInstance.nodePreview.subscribe((id) => previewed.push(id));
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
    expect(callout()).toBe('13 · HVD · Open — upstream');
    expect(marker('hvd').dataset['highlighted']).toBe('true');
  });

  it('marks a mismatched marker, in its name and with a badge', () => {
    const mismatched = NODES.map((n) => (n.node.id === 'hvd' ? { ...n, value: 1, mismatch: true } : n));
    fixture.componentRef.setInput('nodes', mismatched);
    fixture.detectChanges();
    expect(marker('hvd').getAttribute('aria-label')).toBe('HVD: Open — upstream, mismatch');
    expect(marker('hvd').textContent).toContain('!');
    expect(marker('bots').textContent).not.toContain('!');
  });

  it('reflects the selection and keeps one tab stop', () => {
    fixture.componentRef.setInput('selectedId', 'bots');
    fixture.detectChanges();
    expect(marker('bots').getAttribute('aria-selected')).toBe('true');
    expect(marker('bots').tabIndex).toBe(0);
    expect(el.querySelectorAll('[role="option"][tabindex="0"]').length).toBe(1);
  });

  it('selects on click and focus, previews on hover', () => {
    marker('bots').click();
    marker('hvd').dispatchEvent(new FocusEvent('focus'));
    marker('glvms').dispatchEvent(new MouseEvent('mouseenter'));
    marker('glvms').dispatchEvent(new MouseEvent('mouseleave'));
    expect(selected).toEqual(['bots', 'hvd']);
    expect(previewed).toEqual(['glvms', null]);
  });

  it('moves focus in loop order with arrow keys', () => {
    marker('tsms').focus();
    marker('tsms').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(marker('hvd'));
    marker('hvd').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(marker('glvms'));
  });
});
