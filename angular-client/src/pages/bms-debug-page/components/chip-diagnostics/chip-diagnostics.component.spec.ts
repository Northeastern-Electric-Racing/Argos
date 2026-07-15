import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chip } from 'src/utils/bms.utils';

import { ChipDiagnosticsComponent } from './chip-diagnostics.component';

describe('ChipDiagnosticsComponent', () => {
  let component: ChipDiagnosticsComponent;
  let fixture: ComponentFixture<ChipDiagnosticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipDiagnosticsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ChipDiagnosticsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('chip', Chip.Alpha);
    fixture.componentRef.setInput('segment', 0);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
