import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { toLocalInputValue, UiDateTimeInputComponent } from './datetime-input.component';

describe('toLocalInputValue', () => {
  it('formats a Date as local YYYY-MM-DDTHH:mm:ss, zero-padded', () => {
    expect(toLocalInputValue(new Date(2026, 0, 5, 3, 4, 9))).toBe('2026-01-05T03:04:09');
  });

  it('returns an empty string for no date or an invalid one', () => {
    expect(toLocalInputValue(null)).toBe('');
    expect(toLocalInputValue(undefined)).toBe('');
    expect(toLocalInputValue(new Date('nope'))).toBe('');
  });
});

@Component({
  imports: [UiDateTimeInputComponent, FormsModule],
  template: `<ui-datetime-input inputId="when" [(ngModel)]="value" [maxDate]="max()" />`
})
class Host {
  value: Date | null = new Date(2026, 4, 6, 7, 8, 9);
  max = signal<Date | undefined>(new Date(2026, 11, 31, 23, 59, 0));
}

describe('UiDateTimeInputComponent', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    // ngModel writes its first value a microtask after the first render.
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    return { fixture, input };
  };

  it('shows the bound Date to the second, with the max date as the input max', async () => {
    const { input } = await setup();
    expect(input.id).toBe('when');
    expect(input.value).toBe('2026-05-06T07:08:09');
    expect(input.getAttribute('max')).toBe('2026-12-31T23:59:00');
  });

  it('writes a Date back on input, and null when the field is cleared', async () => {
    const { fixture, input } = await setup();
    input.value = '2026-02-03T04:05:06';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.value).toEqual(new Date(2026, 1, 3, 4, 5, 6));

    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.value).toBeNull();
  });
});
