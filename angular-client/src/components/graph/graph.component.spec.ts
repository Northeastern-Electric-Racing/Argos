import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Chart } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { GraphData } from 'src/utils/types.utils';
import { GraphComponent } from './graph.component';
import { LIVE_REFRESH_MS } from './live-line-chart.utils';

describe('GraphComponent (Chart.js)', () => {
  let fixture: ComponentFixture<GraphComponent>;

  beforeEach(() => {
    // Only the refresh timer; Angular's scheduler keeps its real timers
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    fixture?.destroy();
    vi.useRealTimers();
  });

  async function render(inputs: Record<string, unknown>): Promise<Chart> {
    fixture = TestBed.createComponent(GraphComponent);
    const host = fixture.nativeElement as HTMLElement;
    host.style.width = '600px';
    host.style.height = '200px';
    document.body.appendChild(host);
    fixture.componentRef.setInput('color', '#ff0000');
    fixture.componentRef.setInput('graphContainerId', 'graph');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await settle();
    return chart();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function chart(): Chart {
    return fixture.debugElement.query(By.directive(BaseChartDirective)).injector.get(BaseChartDirective).chart!;
  }

  it('draws the data as one line in the given colour', async () => {
    const c = await render({
      data: [
        { x: 1_000, y: 10 },
        { x: 2_000, y: 11 }
      ],
      title: 'Speed'
    });

    expect(c.data.datasets).toHaveLength(1);
    expect(c.data.datasets[0].label).toBe('Speed');
    expect(c.data.datasets[0].borderColor).toBe('#ff0000');
    expect(c.data.datasets[0].data).toEqual([
      { x: 1_000, y: 10 },
      { x: 2_000, y: 11 }
    ]);
  });

  it('picks up points pushed into the data array on the next refresh', async () => {
    const data: GraphData[] = [{ x: 1_000, y: 10 }];
    const c = await render({ data });

    data.push({ x: 2_000, y: 12 });
    vi.advanceTimersByTime(LIVE_REFRESH_MS);

    expect(c.data.datasets[0].data).toEqual([
      { x: 1_000, y: 10 },
      { x: 2_000, y: 12 }
    ]);
    expect(c.scales['x'].max).toBe(2_000);
  });

  it('never hands the caller-owned data array to Chart.js', async () => {
    const data: GraphData[] = [{ x: 1_000, y: 10 }];
    const c = await render({ data });

    expect(c.data.datasets[0].data).not.toBe(data);
  });

  it('slides to the last two minutes by default', async () => {
    const c = await render({
      data: [
        { x: 0, y: 1 },
        { x: 100_000, y: 2 },
        { x: 200_000, y: 3 }
      ]
    });

    expect(c.scales['x'].min).toBe(80_000);
    expect(c.scales['x'].max).toBe(200_000);
    // The point before the window stays, so the line enters from the left edge
    expect(c.data.datasets[0].data).toEqual([
      { x: 0, y: 1 },
      { x: 100_000, y: 2 },
      { x: 200_000, y: 3 }
    ]);
  });

  it('slides to the given time range and drops points before it', async () => {
    const c = await render({
      data: [
        { x: 0, y: 1 },
        { x: 10_000, y: 2 },
        { x: 50_000, y: 3 },
        { x: 60_000, y: 4 }
      ],
      timeRangeSec: 30
    });

    expect(c.scales['x'].min).toBe(30_000);
    expect(c.data.datasets[0].data).toEqual([
      { x: 10_000, y: 2 },
      { x: 50_000, y: 3 },
      { x: 60_000, y: 4 }
    ]);
  });

  it('applies a colour change to the live chart', async () => {
    const c = await render({ data: [{ x: 1_000, y: 10 }] });

    fixture.componentRef.setInput('color', '#00ff00');
    await settle();

    expect(chart()).toBe(c);
    expect(c.data.datasets[0].borderColor).toBe('#00ff00');
  });

  it('follows a new data array, as when a graph is reset', async () => {
    const c = await render({ data: [{ x: 1_000, y: 10 }] });

    fixture.componentRef.setInput('data', [{ x: 5_000, y: 1 }]);
    await settle();

    expect(c.data.datasets[0].data).toEqual([{ x: 5_000, y: 1 }]);
  });

  it('stops refreshing once destroyed', async () => {
    await render({ data: [] });
    expect(vi.getTimerCount()).toBe(1);

    fixture.destroy();

    expect(vi.getTimerCount()).toBe(0);
  });
});
