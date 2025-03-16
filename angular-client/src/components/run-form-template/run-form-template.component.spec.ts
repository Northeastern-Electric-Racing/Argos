import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunFormTemplateComponent } from './run-form-template.component';

describe('RunFormTemplateComponent', () => {
  let component: RunFormTemplateComponent;
  let fixture: ComponentFixture<RunFormTemplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RunFormTemplateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RunFormTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
