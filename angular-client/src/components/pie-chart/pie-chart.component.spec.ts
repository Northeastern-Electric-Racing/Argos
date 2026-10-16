import { ComponentFixture, TestBed } from '@angular/core/testing';
import PieChartComponent from './pie-chart.component';

describe('PieChartComponent', () => {
  let fixture: ComponentFixture<PieChartComponent>;
  let component: PieChartComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PieChartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PieChartComponent);
    component = fixture.componentInstance;
    // Inputs are read through signals only; the apx-chart child is never rendered here.
    fixture.componentRef.setInput('data', [
      { value: 1, name: 'Pumps' },
      { value: 2, name: 'Fans' }
    ]);
  });

  it('derives series and options from data', () => {
    expect(component.series()).toEqual([1, 2]);
    expect(component.chartOptions().labels).toEqual(['Pumps', 'Fans']);
    expect(component.chartOptions().title.text).toBe('Pie Chart');
  });

  it('updates only the series when values change', () => {
    const options = component.chartOptions();
    fixture.componentRef.setInput('data', [
      { value: 3, name: 'Pumps' },
      { value: 4, name: 'Fans' }
    ]);

    expect(component.series()).toEqual([3, 4]);
    expect(component.chartOptions()).toBe(options);
  });

  it('rebuilds options when labels or title change', () => {
    fixture.componentRef.setInput('data', [{ value: 3, name: 'LV Boards' }]);
    fixture.componentRef.setInput('title', 'Usage');

    expect(component.chartOptions().labels).toEqual(['LV Boards']);
    expect(component.chartOptions().title.text).toBe('Usage');
  });

  it('returns empty options when there is no data', () => {
    fixture.componentRef.setInput('data', []);

    expect(component.chartOptions()).toEqual({});
  });
});
