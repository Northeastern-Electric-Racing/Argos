import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiDialogService } from 'src/ui/dialog/dialog.service';
import { GraphDialogComponent } from '../graph-dialog/graph-dialog.component';
import { GraphComponent } from '../graph/graph.component';
import { InfoGraphComponent } from './info-graph.component';
import { GraphData } from 'src/utils/types.utils';

// The real graph builds a Chart.js chart on a timer; the card only needs its inputs.
@Component({ selector: 'graph-component', template: '' })
class GraphStubComponent {
  data = input<GraphData[]>([]);
  color = input<string>('');
  title = input<string | undefined>(undefined);
}

describe('InfoGraphComponent', () => {
  let fixture: ComponentFixture<InfoGraphComponent>;
  let open: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    open = vi.fn();
    await TestBed.configureTestingModule({
      imports: [InfoGraphComponent],
      providers: [{ provide: UiDialogService, useValue: { open } }]
    })
      .overrideComponent(InfoGraphComponent, {
        remove: { imports: [GraphComponent] },
        add: { imports: [GraphStubComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(InfoGraphComponent);
    fixture.componentRef.setInput('data', [{ x: 1, y: 2 }]);
    fixture.componentRef.setInput('icon', 'speed');
    fixture.componentRef.setInput('title', 'Speed Over Time');
    fixture.componentRef.setInput('color', '#4682b4');
    fixture.detectChanges();
  });

  const opener = (): HTMLButtonElement | null =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) =>
      (b.getAttribute('aria-label') ?? '').startsWith('Click for more details')
    ) ?? null;

  it('opens the graph from a real button, named after its visible text and the graph', () => {
    const button = opener();
    expect(button).not.toBeNull();
    expect(button!.type).toBe('button');
    expect(button!.getAttribute('aria-label')).toBe('Click for more details: Speed Over Time');
    expect(button!.textContent).toContain('Click for more details');
  });

  it('opens the larger graph in a dialog with the same series', () => {
    opener()!.click();

    expect(open).toHaveBeenCalledTimes(1);
    const [[component, config]] = open.mock.calls;
    expect(component).toBe(GraphDialogComponent);
    expect(config.header).toBe('Speed Over Time');
    expect(config.data).toEqual(expect.objectContaining({ data: [{ x: 1, y: 2 }], color: '#4682b4' }));
  });

  it('shows the hint once, from the button, not from the card', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.split('Click for more details').length - 1).toBe(1);
  });
});
