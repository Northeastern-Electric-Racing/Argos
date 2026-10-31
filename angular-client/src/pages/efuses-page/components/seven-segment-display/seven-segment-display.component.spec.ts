import { TestBed } from '@angular/core/testing';
import SevenSegmentDisplayComponent from './seven-segment-display.component';

describe('SevenSegmentDisplayComponent', () => {
  it('hides the unlit ghost digits from assistive tech, so only the value is read', () => {
    const fixture = TestBed.createComponent(SevenSegmentDisplayComponent);
    fixture.componentRef.setInput('value', '1.23');
    fixture.componentRef.setInput('unit', 'V');
    fixture.detectChanges();

    const ghost: HTMLElement = fixture.nativeElement.querySelector('.segment-text.background');
    const value: HTMLElement = fixture.nativeElement.querySelector('.segment-text.foreground');
    expect(ghost.getAttribute('aria-hidden')).toBe('true');
    expect(value.hasAttribute('aria-hidden')).toBe(false);
    expect(value.textContent).toContain('1');
  });
});
