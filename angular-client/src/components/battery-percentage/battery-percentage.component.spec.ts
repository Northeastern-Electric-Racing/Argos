import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BatteryPercentageComponent } from './battery-percentage.component';

describe('BatteryPercentageComponent', () => {
  let fixture: ComponentFixture<BatteryPercentageComponent>;
  let component: BatteryPercentageComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatteryPercentageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BatteryPercentageComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('percentage', 50);
    fixture.componentRef.setInput('height', 60);
    fixture.componentRef.setInput('width', 30);
    fixture.detectChanges();
  });

  it('derives battery styles from height and width', () => {
    expect(component.heightpx()).toBe('60px');
    expect(component.widthpx()).toBe('30px');
    expect(component.fillWidth()).toBe('27px');
    expect(component.nubHeight()).toBe('6px');
    expect(component.nubWidth()).toBe('15px');
    expect(component.roundCorner()).toBe('1.5px');
  });

  it('updates styles and the rendered bar when dimensions change', () => {
    fixture.componentRef.setInput('height', 100);
    fixture.componentRef.setInput('width', 50);
    fixture.detectChanges();

    expect(component.fillMarginBottom()).toBe('5px');
    expect(component.roundCorner()).toBe('2.5px');
    const bar: HTMLElement = fixture.nativeElement.querySelector('.battery-bar');
    expect(bar.style.height).toBe('100px');
    expect(bar.style.width).toBe('50px');
  });

  it('greys the nub while clicked and fades back on a second click', () => {
    const nub: HTMLElement = fixture.nativeElement.querySelector('.nub');
    const idle = nub.style.backgroundColor;

    nub.click();
    fixture.detectChanges();
    expect(nub.style.backgroundColor).toBe('grey');

    nub.click();
    fixture.detectChanges();
    expect(nub.style.backgroundColor).toBe(idle);
  });
});
