import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Subject } from 'rxjs';

import { RunFormComponent } from './run-form.component';

describe('RunFormComponent', () => {
  let component: RunFormComponent;
  let fixture: ComponentFixture<RunFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RunFormComponent],
      providers: [{ provide: BrnDialogRef, useValue: { close: () => {}, closed$: new Subject() } }]
    }).compileComponents();

    fixture = TestBed.createComponent(RunFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
