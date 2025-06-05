import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BmsAtAGlanceReDesignComponent } from './bms-at-a-glance-redesign.component';

describe('BmsAtAGlanceReDesignComponent', () => {
  let component: BmsAtAGlanceReDesignComponent;
  let fixture: ComponentFixture<BmsAtAGlanceReDesignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BmsAtAGlanceReDesignComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BmsAtAGlanceReDesignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
