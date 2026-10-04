import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConnectionDotWithMessageComponent } from './connection-dot-with-message.component';

describe('ConnectionDotWithMessageComponent', () => {
  let component: ConnectionDotWithMessageComponent;
  let fixture: ComponentFixture<ConnectionDotWithMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectionDotWithMessageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConnectionDotWithMessageComponent);
    component = fixture.componentInstance;
    // getStatusColor is a required input read by the template.
    fixture.componentRef.setInput('getStatusColor', () => 'green');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
