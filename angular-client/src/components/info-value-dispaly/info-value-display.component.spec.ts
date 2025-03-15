import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoValueDisplayComponent } from './info-value-display.component';

describe('InfoValueDisplayComponent', () => {
  let component: InfoValueDisplayComponent;
  let fixture: ComponentFixture<InfoValueDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoValueDisplayComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(InfoValueDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
