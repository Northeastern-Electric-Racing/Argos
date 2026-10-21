import { ComponentFixture, TestBed } from '@angular/core/testing';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { RunFormComponent } from './run-form.component';

describe('RunFormComponent', () => {
  let component: RunFormComponent;
  let fixture: ComponentFixture<RunFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RunFormComponent],
      providers: [{ provide: POLYMORPHEUS_CONTEXT, useValue: { completeWith: () => {} } }]
    }).compileComponents();

    fixture = TestBed.createComponent(RunFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
