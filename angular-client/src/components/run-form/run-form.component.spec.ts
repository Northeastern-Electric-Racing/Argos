import { DialogRef } from '@angular/cdk/dialog';
import { ToastService } from 'src/ui/toast/toast.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { RunFormComponent } from './run-form.component';

describe('RunFormComponent', () => {
  let component: RunFormComponent;
  let fixture: ComponentFixture<RunFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RunFormComponent],
      providers: [ToastService, { provide: DialogRef, useValue: { close: () => {}, closed: new Subject() } }]
    }).compileComponents();

    fixture = TestBed.createComponent(RunFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
