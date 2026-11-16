import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { buttonClass, iconButtonClass } from '../recipes/button';
import { UiButtonDirective, UiIconButtonDirective } from './button.directive';

// Angular's [class] binding may reorder classes, so compare them as sorted sets.
const sorted = (classes: string): string[] => [...new Set(classes.split(/\s+/).filter(Boolean))].sort();
const classesOf = (e: HTMLElement): string[] => sorted(e.className);

@Component({
  imports: [UiButtonDirective, UiIconButtonDirective],
  template: `
    <button id="plain" uiButton type="button">Save</button>
    <button id="styled" uiButton class="w-full" [variant]="variant()" [size]="size()" type="button">Go</button>
    <a id="link" uiButton variant="text" href="/x">Link</a>
    <button id="icon" uiIconButton size="sm" type="button" aria-label="Close">x</button>
  `
})
class Host {
  variant = signal<'primary' | 'danger'>('danger');
  size = signal<'sm' | 'lg'>('sm');
}

describe('uiButton and uiIconButton', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = (id: string): HTMLElement => fixture.nativeElement.querySelector('#' + id);
    return { fixture, el };
  };

  it('defaults to a primary, md button and reports both as data attributes', async () => {
    const { el } = await setup();
    expect(classesOf(el('plain'))).toEqual(sorted(buttonClass('primary', 'md')));
    expect(el('plain').dataset['variant']).toBe('primary');
    expect(el('plain').dataset['size']).toBe('md');
  });

  it('follows its variant and size inputs and keeps the consumer layout classes', async () => {
    const { fixture, el } = await setup();
    expect(el('styled').classList).toContain('w-full');
    for (const c of buttonClass('danger', 'sm').split(' ')) expect(el('styled').classList).toContain(c);
    fixture.componentInstance.variant.set('primary');
    fixture.componentInstance.size.set('lg');
    fixture.detectChanges();
    expect(el('styled').dataset['size']).toBe('lg');
    for (const c of buttonClass('primary', 'lg').split(' ')) expect(el('styled').classList).toContain(c);
    expect(el('styled').classList).not.toContain('text-danger');
    expect(el('styled').classList).toContain('w-full');
  });

  it('styles links as buttons too', async () => {
    const { el } = await setup();
    expect(classesOf(el('link'))).toEqual(sorted(buttonClass('text', 'md')));
  });

  it('styles an icon-only button and leaves its accessible name to the consumer', async () => {
    const { el } = await setup();
    expect(classesOf(el('icon'))).toEqual(sorted(iconButtonClass('sm')));
    expect(el('icon').getAttribute('aria-label')).toBe('Close');
  });
});
