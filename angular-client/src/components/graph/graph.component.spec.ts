import { ComponentFixture, TestBed } from '@angular/core/testing';
import ApexCharts from 'apexcharts';
import { GraphComponent } from './graph.component';

describe('GraphComponent (info graph)', () => {
  let fixture: ComponentFixture<GraphComponent>;
  let component: GraphComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GraphComponent);
    component = fixture.componentInstance;
    // ngOnInit (chart rendering) is never run; stub the chart so ngOnDestroy can tear down.
    component.chart = jasmine.createSpyObj<ApexCharts>('ApexCharts', ['destroy']);
    fixture.componentRef.setInput('data', []);
    fixture.componentRef.setInput('color', '#ff0000');
    fixture.componentRef.setInput('graphContainerId', 'graph');
  });

  it('defaults the time range to 2 minutes', () => {
    expect(component.timeRangeMs()).toBe(120000);
  });

  it('derives the time range and stroke color from inputs', () => {
    fixture.componentRef.setInput('timeRangeSec', 30);
    fixture.componentRef.setInput('color', '#00ff00');

    expect(component.timeRangeMs()).toBe(30000);
    expect(component.options().stroke.colors).toEqual(['#00ff00']);
  });
});
