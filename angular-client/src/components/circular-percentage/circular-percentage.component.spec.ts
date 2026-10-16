import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CircularPercentageComponent } from './circular-percentage.component';

describe('CircularPercentageComponent', () => {
  let fixture: ComponentFixture<CircularPercentageComponent>;
  let component: CircularPercentageComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CircularPercentageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CircularPercentageComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('dimension', 100);
    fixture.componentRef.setInput('ringColor', '#ff0000');
    fixture.componentRef.setInput('percentage', 50);
    fixture.detectChanges();
  });

  it('derives sizes from dimension', () => {
    expect(component.innerCircleDimension()).toBeCloseTo(87);
    expect(component.percentageFontSize()).toBeCloseTo(39);
    expect(component.percentageSignFontSize()).toBeCloseTo(17);
    expect(component.percentageSignOffset()).toBeCloseTo(2);
  });

  it('updates sizes and the rendered ring when dimension changes', () => {
    fixture.componentRef.setInput('dimension', 200);
    fixture.detectChanges();

    expect(component.innerCircleDimension()).toBeCloseTo(174);
    expect(component.percentageFontSize()).toBeCloseTo(78);
    const inner: HTMLElement = fixture.nativeElement.querySelector('.inner');
    expect(inner.style.width).toBe('174px');
  });
});
