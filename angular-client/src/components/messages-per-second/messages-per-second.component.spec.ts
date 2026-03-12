import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessagesPerSecondComponent } from './messages-per-second.component';

describe('MessagesPerSecondComponent', () => {
  let component: MessagesPerSecondComponent;
  let fixture: ComponentFixture<MessagesPerSecondComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessagesPerSecondComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MessagesPerSecondComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
