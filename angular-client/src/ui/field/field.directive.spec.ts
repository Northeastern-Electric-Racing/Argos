import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fieldClasses, inputClass } from '../recipes/field';
import { UiFieldErrorDirective, UiInputDirective, UiLabelDirective } from './field.directive';

// Angular's [class] binding may reorder classes, so compare them as sorted sets.
const sorted = (classes: string): string[] => [...new Set(classes.split(/\s+/).filter(Boolean))].sort();
const classesOf = (e: HTMLElement): string[] => sorted(e.className);

@Component({
  imports: [UiInputDirective, UiLabelDirective, UiFieldErrorDirective],
  template: `
    <label id="label" uiLabel for="name">Name</label>
    <input id="name" uiInput class="w-full" aria-describedby="name-error" [attr.aria-invalid]="invalid()" />
    <input id="small" [uiInput]="size()" />
    <textarea id="notes" uiInput></textarea>
    <span id="name-error" uiFieldError>Name is required</span>
  `
})
class Host {
  invalid = signal(true);
  size = signal<'sm' | 'md'>('sm');
}

describe('uiInput, uiLabel and uiFieldError', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = (id: string): HTMLElement => fixture.nativeElement.querySelector('#' + id);
    return { fixture, el };
  };

  it('styles an input at md by default, keeping its own layout classes and ARIA wiring', async () => {
    const { el } = await setup();
    for (const c of inputClass('md').split(' ')) expect(el('name').classList).toContain(c);
    expect(el('name').classList).toContain('w-full');
    expect(el('name').getAttribute('aria-invalid')).toBe('true');
    expect(el('name').getAttribute('aria-describedby')).toBe('name-error');
    expect(el('name').dataset['size']).toBe('md');
  });

  it('takes its size from the directive value', async () => {
    const { fixture, el } = await setup();
    expect(classesOf(el('small'))).toEqual(sorted(inputClass('sm')));
    fixture.componentInstance.size.set('md');
    fixture.detectChanges();
    expect(classesOf(el('small'))).toEqual(sorted(inputClass('md')));
  });

  it('lets a textarea grow with its rows', async () => {
    const { el } = await setup();
    expect(classesOf(el('notes'))).toEqual(sorted(inputClass('md', 'textarea')));
  });

  it('styles the label and the error line', async () => {
    const { el } = await setup();
    expect(classesOf(el('label'))).toEqual(sorted(fieldClasses.label));
    expect(classesOf(el('name-error'))).toEqual(sorted(fieldClasses.error));
  });
});
