import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Chart } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import PieChartComponent from './pie-chart.component';

describe('PieChartComponent', () => {
  let fixture: ComponentFixture<PieChartComponent>;

  afterEach(() => fixture?.destroy());

  async function render(inputs: Record<string, unknown>): Promise<Chart> {
    fixture = TestBed.createComponent(PieChartComponent);
    const host = fixture.nativeElement as HTMLElement;
    host.style.width = '300px';
    host.style.height = '150px';
    document.body.appendChild(host);
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

  it('draws a pie of the values, labelled by name', async () => {
    const c = await render({
      data: [
        { value: 1, name: 'Pumps' },
        { value: 2, name: 'Fans' }
      ]
    });

    expect(c.data.labels).toEqual(['Pumps', 'Fans']);
    expect(c.data.datasets[0].data).toEqual([1, 2]);
  });

  it('updates the same chart when the values change', async () => {
    const c = await render({ data: [{ value: 1, name: 'Pumps' }] });

    fixture.componentRef.setInput('data', [
      { value: 3, name: 'Pumps' },
      { value: 4, name: 'LV Boards' }
    ]);
    await settle();

    expect(chart()).toBe(c);
    expect(c.data.labels).toEqual(['Pumps', 'LV Boards']);
    expect(c.data.datasets[0].data).toEqual([3, 4]);
  });

  function tooltipLines(c: Chart, index: number): string[] {
    c.tooltip!.setActiveElements([{ datasetIndex: 0, index }], { x: 0, y: 0 });
    return c.tooltip!.body.flatMap((item) => item.lines);
  }

  it("shows each slice's value and share of the total in its tooltip", async () => {
    const c = await render({
      data: [
        { value: 1, name: 'Pumps' },
        { value: 2, name: 'Fans' }
      ]
    });

    expect(tooltipLines(c, 0)).toEqual(['1 (33.3%)']);
    expect(tooltipLines(c, 1)).toEqual(['2 (66.7%)']);
  });

  it('leaves slices hidden in the legend out of the total', async () => {
    const c = await render({
      data: [
        { value: 1, name: 'Pumps' },
        { value: 2, name: 'Fans' },
        { value: 1, name: 'LV Boards' }
      ]
    });

    c.toggleDataVisibility(1);
    c.update('none');

    expect(tooltipLines(c, 0)).toEqual(['1 (50.0%)']);
  });

  it('shows only the value when every slice is zero', async () => {
    const c = await render({
      data: [
        { value: 0, name: 'Pumps' },
        { value: 0, name: 'Fans' }
      ]
    });

    expect(tooltipLines(c, 0)).toEqual(['0']);
  });
});
