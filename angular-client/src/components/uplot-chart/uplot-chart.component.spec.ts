import { ComponentFixture, TestBed } from '@angular/core/testing';
import uPlot from 'uplot';
import { UplotChartComponent, UplotChartOptions } from './uplot-chart.component';

describe('UplotChartComponent', () => {
  let fixture: ComponentFixture<UplotChartComponent>;

  const options = (seriesCount: number): UplotChartOptions => ({
    ms: 1,
    scales: { x: { time: true } },
    series: [{}, ...Array.from({ length: seriesCount }, (_, i) => ({ label: `s${i}` }))]
  });

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function create(opts: UplotChartOptions, data: uPlot.AlignedData): Promise<UplotChartComponent> {
    fixture = TestBed.createComponent(UplotChartComponent);
    Object.assign((fixture.nativeElement as HTMLElement).style, { width: '400px', height: '300px', display: 'block' });
    document.body.appendChild(fixture.nativeElement);
    fixture.componentRef.setInput('options', opts);
    fixture.componentRef.setInput('data', data);
    await settle();
    return fixture.componentInstance;
  }

  afterEach(() => fixture?.destroy());

  it('renders a uPlot chart into its host', async () => {
    const chart = await create(options(1), [
      [1000, 2000],
      [1, 2]
    ]);

    expect(chart.instance).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.uplot')).not.toBeNull();
    expect(chart.instance!.data[1]).toEqual([1, 2]);
  });

  it('draws new data in place without rebuilding the chart', async () => {
    const chart = await create(options(1), [[1000], [1]]);
    const first = chart.instance;

    fixture.componentRef.setInput('data', [
      [1000, 2000, 3000],
      [1, 2, 3]
    ]);
    await settle();

    expect(chart.instance).toBe(first);
    expect(chart.instance!.data[0]).toEqual([1000, 2000, 3000]);
    expect(chart.instance!.scales['x'].max).toBe(3000);
  });

  it('rebuilds the chart when the options change', async () => {
    const chart = await create(options(1), [[1000], [1]]);
    const first = chart.instance;

    fixture.componentRef.setInput('options', options(2));
    fixture.componentRef.setInput('data', [[1000], [1], [2]]);
    await settle();

    expect(chart.instance).not.toBe(first);
    expect(chart.instance!.series.length).toBe(3);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.uplot').length).toBe(1);
  });

  it('pins the x scale to xRange instead of fitting the data', async () => {
    const chart = await create(options(1), [
      [1000, 2000, 3000],
      [1, 2, 3]
    ]);

    fixture.componentRef.setInput('xRange', { min: 2000, max: 3000 });
    await settle();

    expect(chart.instance!.scales['x'].min).toBe(2000);
    expect(chart.instance!.scales['x'].max).toBe(3000);

    fixture.componentRef.setInput('xRange', null);
    await settle();

    expect(chart.instance!.scales['x'].min).toBe(1000);
  });

  it('destroys the chart with the component', async () => {
    const chart = await create(options(1), [[1000], [1]]);
    const instance = chart.instance!;
    spyOn(instance, 'destroy').and.callThrough();

    fixture.destroy();

    expect(instance.destroy).toHaveBeenCalled();
    expect(chart.instance).toBeNull();
  });
});
