import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Chart } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { GraphData } from 'src/utils/types.utils';
import { LIVE_REFRESH_MS } from '../graph/live-line-chart.utils';
import { DoubleLineGraphComponent } from './double-line-graph.component';

describe('DoubleLineGraphComponent', () => {
  let fixture: ComponentFixture<DoubleLineGraphComponent>;

  beforeEach(() => {
    // Only the refresh timer; Angular's scheduler keeps its real timers
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    fixture?.destroy();
    vi.useRealTimers();
  });

  async function render(inputs: Record<string, unknown>): Promise<Chart> {
    fixture = TestBed.createComponent(DoubleLineGraphComponent);
    const host = fixture.nativeElement as HTMLElement;
    host.style.width = '600px';
    host.style.height = '200px';
    document.body.appendChild(host);
    fixture.componentRef.setInput('data1', []);
    fixture.componentRef.setInput('color1', '#ff0000');
    fixture.componentRef.setInput('data2', []);
    fixture.componentRef.setInput('color2', '#0000ff');
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

  it('draws both lines with their titles and colours, and shows the legend', async () => {
    const c = await render({
      data1: [{ x: 1_000, y: 4.1 }],
      title1: 'High Cell Volts',
      data2: [{ x: 1_000, y: 3.9 }],
      title2: 'Low Cell Volts'
    });

    expect(c.data.datasets.map((d) => d.label)).toEqual(['High Cell Volts', 'Low Cell Volts']);
    expect(c.data.datasets.map((d) => d.borderColor)).toEqual(['#ff0000', '#0000ff']);
    expect(c.data.datasets.map((d) => d.data)).toEqual([[{ x: 1_000, y: 4.1 }], [{ x: 1_000, y: 3.9 }]]);
    expect(c.options.plugins?.legend?.display).toBe(true);
  });

  it('picks up points pushed into either data array on the next refresh', async () => {
    const high: GraphData[] = [{ x: 1_000, y: 4.1 }];
    const low: GraphData[] = [{ x: 1_000, y: 3.9 }];
    const c = await render({ data1: high, data2: low });

    high.push({ x: 2_000, y: 4.2 });
    low.push({ x: 3_000, y: 3.8 });
    vi.advanceTimersByTime(LIVE_REFRESH_MS);

    expect(c.data.datasets[0].data).toHaveLength(2);
    expect(c.data.datasets[1].data).toHaveLength(2);
    expect(c.scales['x'].max).toBe(3_000);
  });

  it('slides both lines to the time range, ending at the latest point of either', async () => {
    const c = await render({
      data1: [
        { x: 0, y: 4 },
        { x: 50_000, y: 4.1 }
      ],
      data2: [
        { x: 0, y: 3 },
        { x: 60_000, y: 3.1 }
      ],
      timeRangeSec: 30
    });

    expect(c.scales['x'].min).toBe(30_000);
    expect(c.scales['x'].max).toBe(60_000);
  });

  it('keeps a line hidden from the legend hidden across refreshes', async () => {
    const high: GraphData[] = [{ x: 1_000, y: 4.1 }];
    const c = await render({ data1: high, data2: [{ x: 1_000, y: 3.9 }] });
    const [, lowItem] = c.legend!.legendItems!;

    // What a legend click does
    c.options.plugins!.legend!.onClick!.call(c.legend!, {} as never, lowItem, c.legend!);
    high.push({ x: 2_000, y: 4.2 });
    vi.advanceTimersByTime(LIVE_REFRESH_MS * 2);

    expect(c.isDatasetVisible(0)).toBe(true);
    expect(c.isDatasetVisible(1)).toBe(false);
  });

  it('applies colour and title changes to the live chart', async () => {
    const c = await render({ data1: [{ x: 1_000, y: 4.1 }] });

    fixture.componentRef.setInput('color2', '#00ff00');
    fixture.componentRef.setInput('title1', 'High');
    await settle();

    expect(chart()).toBe(c);
    expect(c.data.datasets[1].borderColor).toBe('#00ff00');
    expect(c.data.datasets[0].label).toBe('High');
  });

  it('stops refreshing once destroyed', async () => {
    await render({});
    expect(vi.getTimerCount()).toBe(1);

    fixture.destroy();

    expect(vi.getTimerCount()).toBe(0);
  });
});
