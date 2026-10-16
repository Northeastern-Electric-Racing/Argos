import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { GraphData, ObservableGraphInfo } from 'src/utils/types.utils';
import CustomGraphComponent from './graph.component';

// Axis/range/layout math (including the #630 multi y-axis regression) is covered in
// graph-scale.spec.ts; these tests cover the component's data handling and legend.
describe('CustomGraphComponent', () => {
  const config = { maxPoints: 100, yMin: null, yMax: null, rangeMode: 'time' as const, timeRangeMs: 10_000 };
  let fixture: ComponentFixture<CustomGraphComponent>;
  let component: CustomGraphComponent;

  function topic(label: string, ...points: [number, number][]) {
    const updates = new BehaviorSubject<GraphData[][]>([points.map(([x, y]) => ({ x, y }))]);
    return { info: { label, updates } as ObservableGraphInfo, updates };
  }

  async function render(values: ObservableGraphInfo[], inputs: Record<string, unknown> = {}) {
    fixture = TestBed.createComponent(CustomGraphComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('graphConfig', config);
    fixture.componentRef.setInput('valuesSubject', values);
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    await fixture.whenStable();
  }

  afterEach(() => fixture?.destroy());

  it('keeps each series sorted by time, rounding values to 4 decimals', async () => {
    const speed = topic('VCU/CarState/speed', [1000, 1.234567], [3000, 3]);
    await render([speed.info]);

    speed.updates.next([[{ x: 2000, y: 2 }]]);

    expect(component.data.get('VCU/CarState/speed 0')).toEqual([
      { x: 1000, y: 1.2346 },
      { x: 2000, y: 2 },
      { x: 3000, y: 3 }
    ]);
  });

  it('trims points that fall out of the live time window', async () => {
    const speed = topic('VCU/CarState/speed', [0, 1]);
    await render([speed.info], { realTime: true });

    speed.updates.next([[{ x: 20_000, y: 2 }]]);

    expect(component.data.get('VCU/CarState/speed 0')!.map((p) => p.x)).toEqual([20_000]);
  });

  it('ignores new data while paused', async () => {
    const speed = topic('VCU/CarState/speed', [0, 1]);
    await render([speed.info]);
    fixture.componentRef.setInput('isPaused', true);
    await fixture.whenStable();

    speed.updates.next([[{ x: 1000, y: 2 }]]);

    expect(component.data.get('VCU/CarState/speed 0')!.length).toBe(1);
  });

  it('clears the graph when the selected topics change', async () => {
    await render([topic('A', [0, 1]).info, topic('B', [0, 2]).info]);
    expect(component.legend().map((e) => e.name)).toEqual(['A 0', 'B 0']);

    fixture.componentRef.setInput('valuesSubject', [topic('B', [5, 2]).info]);
    await fixture.whenStable();

    expect(Array.from(component.data.keys())).toEqual(['B 0']);
    expect(component.legend().map((e) => e.name)).toEqual(['B 0']);
  });

  it('lists a legend button per series that toggles it off and on', async () => {
    await render([topic('A', [0, 1]).info, topic('B', [0, 2]).info]);
    const buttons = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('.legend-item'));
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['A 0', 'B 0']);

    buttons()[1].click();
    await fixture.whenStable();
    expect(component.hidden().has('B 0')).toBeTrue();
    expect(buttons()[1].getAttribute('aria-pressed')).toBe('false');

    buttons()[1].click();
    await fixture.whenStable();
    expect(component.hidden().has('B 0')).toBeFalse();
  });

  it('draws lines and axes with WebGL2', async () => {
    if (!document.createElement('canvas').getContext('webgl2')) {
      pending('WebGL2 is unavailable in this browser');
    }
    await render([topic('A', [0, 1], [1000, 5], [2000, 3]).info, topic('B', [0, 7], [2000, 9]).info]);
    fixture.nativeElement.style.cssText = 'display: flex; width: 400px; height: 300px';
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(component.renderError()).toBeNull();
    const [glCanvas, overlay] = fixture.nativeElement.querySelectorAll('canvas') as NodeListOf<HTMLCanvasElement>;
    expect(glCanvas.width).toBeGreaterThan(0);
    // The overlay has drawn something (grid and tick labels)
    const pixels = overlay.getContext('2d')!.getImageData(0, 0, overlay.width, overlay.height).data;
    expect(pixels.some((v) => v !== 0)).toBeTrue();
  });

  it('explains when WebGL2 is unavailable instead of failing silently', async () => {
    const { getContext } = HTMLCanvasElement.prototype;
    spyOn(HTMLCanvasElement.prototype, 'getContext').and.callFake(function (this: HTMLCanvasElement, id: string) {
      return id === 'webgl2' ? null : getContext.call(this, id as '2d');
    } as typeof getContext);

    await render([topic('A', [0, 1]).info]);

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('WebGL2');
  });
});
