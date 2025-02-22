import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BmsDebugPageComponent } from './bms-debug-page.component';

describe('BmsDebugPageComponent', () => {
  let component: BmsDebugPageComponent;
  let fixture: ComponentFixture<BmsDebugPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BmsDebugPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BmsDebugPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
