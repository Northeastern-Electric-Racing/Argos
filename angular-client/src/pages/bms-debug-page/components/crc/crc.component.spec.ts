import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CRCComponent } from './crc.component';

describe('CRCComponent', () => {
  let component: CRCComponent;
  let fixture: ComponentFixture<CRCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CRCComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CRCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
