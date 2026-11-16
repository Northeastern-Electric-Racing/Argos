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

  it('shows N/A and Msgs/Sec in the muted text token, with no inline colour', () => {
    const lines = [...fixture.nativeElement.querySelectorAll('p')] as HTMLElement[];
    expect(lines.map((p) => p.textContent?.trim())).toEqual(['N/A', 'Msgs/Sec']);
    for (const p of lines) {
      expect(p.classList).toContain('text-fg-muted');
      expect(p.getAttribute('style') ?? '').toBe('');
    }
  });
});
