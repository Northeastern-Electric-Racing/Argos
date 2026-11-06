import { TestBed } from '@angular/core/testing';
import SevenSegmentDisplayComponent from './seven-segment-display.component';

describe('SevenSegmentDisplayComponent', () => {
  it('hides the unlit ghost digits from assistive tech, so only the value is read', () => {
    const fixture = TestBed.createComponent(SevenSegmentDisplayComponent);
    fixture.componentRef.setInput('value', '1.23');
    fixture.componentRef.setInput('unit', 'V');
    fixture.detectChanges();

    const hidden: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[aria-hidden="true"]'));
    expect(hidden.map((el) => el.textContent)).toEqual(['8․88']);

    const read = (fixture.nativeElement as HTMLElement).cloneNode(true) as HTMLElement;
    read.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
    expect(read.textContent?.replace(/\s+/g, '')).toBe('1․23V');
  });
});
