import { ComponentFixture, TestBed } from '@angular/core/testing';
import ApexCharts from 'apexcharts';
import { DoubleLineGraphComponent } from './double-line-graph.component';

describe('DoubleLineGraphComponent', () => {
  let fixture: ComponentFixture<DoubleLineGraphComponent>;
  let component: DoubleLineGraphComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoubleLineGraphComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DoubleLineGraphComponent);
    component = fixture.componentInstance;
    // ngOnInit (chart rendering) is never run; stub the chart so ngOnDestroy can tear down.
    component.chart = jasmine.createSpyObj<ApexCharts>('ApexCharts', ['destroy']);
    fixture.componentRef.setInput('data1', []);
    fixture.componentRef.setInput('color1', '#ff0000');
    fixture.componentRef.setInput('data2', []);
    fixture.componentRef.setInput('color2', '#0000ff');
    fixture.componentRef.setInput('graphContainerId', 'graph');
  });

  it('defaults the time range to 2 minutes', () => {
    expect(component.timeRangeMs()).toBe(120000);
  });

  it('derives the time range, colors and series from inputs', () => {
    const data = [{ x: 1, y: 2 }];
    fixture.componentRef.setInput('timeRangeSec', 60);
    fixture.componentRef.setInput('color2', '#00ff00');
    fixture.componentRef.setInput('title1', 'High');
    fixture.componentRef.setInput('data1', data);

    expect(component.timeRangeMs()).toBe(60000);
    expect(component.options().colors).toEqual(['#ff0000', '#00ff00']);
    expect(component.options().series[0]).toEqual({ name: 'High', data });
  });
});
