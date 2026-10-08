import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BmsHeaderComponent } from './bms-header.component';

describe('BmsHeaderComponent', () => {
  let component: BmsHeaderComponent;
  let fixture: ComponentFixture<BmsHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BmsHeaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BmsHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pageTitle', 'Test');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call onResize and update windowSize on window resize', () => {
    spyOn(component, 'onResize').and.callThrough();
    component.windowSize = -1;

    window.dispatchEvent(new Event('resize'));

    expect(component.onResize).toHaveBeenCalled();
    expect(component.windowSize).toBe(window.innerWidth);
  });
});
