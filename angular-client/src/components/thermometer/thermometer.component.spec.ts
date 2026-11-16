import { ComponentFixture, TestBed } from '@angular/core/testing';
import ThermometerComponent from './thermometer.component';

describe('ThermometerComponent', () => {
  let fixture: ComponentFixture<ThermometerComponent>;

  const render = (temperature: number) => {
    fixture.componentRef.setInput('temperature', temperature);
    fixture.componentRef.setInput('min', 0);
    fixture.componentRef.setInput('max', 60);
    fixture.detectChanges();
  };
  /** The bulb and the mercury column, the two parts that take the temperature's colour. */
  const filled = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('[data-mercury]'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ThermometerComponent] }).compileComponents();
    fixture = TestBed.createComponent(ThermometerComponent);
  });

  it('fills the bulb and the column blue in the lower half of its range', () => {
    render(10);
    expect(filled().map((e) => e.style.backgroundColor)).toEqual(['blue', 'blue']);
  });

  it('fills them yellow up to two thirds of the range, red above', () => {
    render(35);
    expect(filled().map((e) => e.style.backgroundColor)).toEqual(['yellow', 'yellow']);
    render(50);
    expect(filled().map((e) => e.style.backgroundColor)).toEqual(['red', 'red']);
  });
});
