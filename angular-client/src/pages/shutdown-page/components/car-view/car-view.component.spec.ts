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
  const marker = (id: string) => el.querySelector<SVGGElement>(`[data-node-id="${id}"]`)!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CarViewComponent] }).compileComponents();
    fixture = TestBed.createComponent(CarViewComponent);
    fixture.componentRef.setInput('nodes', NODES);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('renders a marker per node and a segment between each pair', () => {
    expect(el.querySelectorAll('[data-node-id]').length).toBe(19);
    expect(el.querySelectorAll('line.segment').length).toBe(18);
  });

  it('labels markers with their state', () => {
    expect(marker('tsms').getAttribute('aria-label')).toBe('TSMS: Open — cause');
  });

  it('shows topic, value and age in the tooltip', () => {
    expect(marker('tsms').querySelector('title')!.textContent!.trim()).toBe('TSMS · VCU/Shutdown/TSMS_GPIO = 0 · 3 s ago');
    expect(marker('glvms').querySelector('title')!.textContent!.trim()).toBe('GLV master switch · no sensor');
  });

  it('shows no data in the tooltip for a silent measured node', () => {
    const silent = NODES.map((n) =>
      n.node.id === 'hvd' ? { ...n, state: 'no-data' as const, value: undefined, ageMs: undefined } : n
    );
    fixture.componentRef.setInput('nodes', silent);
    fixture.detectChanges();
    expect(marker('hvd').querySelector('title')!.textContent!.trim()).toBe('HVD · VCU/Shutdown/HVD_GPIO · no data');
  });
});
