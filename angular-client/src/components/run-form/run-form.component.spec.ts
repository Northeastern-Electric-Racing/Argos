import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunFormComponent } from './run-form.component';

describe('RunFormComponent', () => {
  let component: RunFormComponent;
  let fixture: ComponentFixture<RunFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RunFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RunFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
