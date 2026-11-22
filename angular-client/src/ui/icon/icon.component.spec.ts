import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IconSize } from '../recipes/icon';
import { UiIconComponent } from './icon.component';
import { UiIconRegistry } from './icon-registry';

@Component({
  imports: [UiIconComponent],
  template: `
    <ui-icon class="font" name="close" />
    <ui-icon class="sized text-danger" name="delete" [size]="size()" />
    <ui-icon class="named" name="warning" label="Warning" />
    <ui-icon class="svg" [svg]="svg()" size="lg" />
  `
})
class Host {
  size = signal<IconSize>('sm');
  svg = signal('wifi');
}

describe('UiIconComponent', () => {
  const setup = async ({ http = false } = {}) => {
    if (http) TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    if (http) TestBed.inject(UiIconRegistry).register({ wifi: 'assets/icons/wifi.svg', bolt: 'assets/icons/bolt.svg' });
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const icon = (cls: string): HTMLElement => fixture.nativeElement.querySelector(`ui-icon.${cls}`);
    const classes = (cls: string) => icon(cls).className.split(/\s+/);
    return { fixture, icon, classes };
  };

  it('is hidden from assistive tech by default, as mat-icon was', async () => {
    const { icon } = await setup();
    expect(icon('font').getAttribute('aria-hidden')).toBe('true');
    expect(icon('font').hasAttribute('role')).toBe(false);
    expect(icon('font').hasAttribute('aria-label')).toBe(false);
  });

  it('with a label, is an image named by it', async () => {
    const { icon } = await setup();
    expect(icon('named').getAttribute('role')).toBe('img');
    expect(icon('named').getAttribute('aria-label')).toBe('Warning');
    expect(icon('named').hasAttribute('aria-hidden')).toBe(false);
  });

  it('draws a Material Icons ligature from its name, untranslated', async () => {
    const { icon, classes } = await setup();
    expect(icon('font').textContent).toBe('close');
    expect(icon('font').getAttribute('translate')).toBe('no');
    expect(classes('font')).toEqual(expect.arrayContaining(['font-icons', 'leading-none', 'normal-case', 'select-none']));
  });

  it('is 24px unless sized, at zero specificity so a utility on it wins', async () => {
    const { classes } = await setup();
    expect(classes('font')).toEqual(expect.arrayContaining(['[:where(&)]:size-6', '[:where(&)]:text-[24px]']));
  });

  it('takes its box and font size from the size class, keeping its own classes', async () => {
    const { fixture, classes } = await setup();
    expect(classes('sized')).toEqual(expect.arrayContaining(['size-4.5', 'text-[18px]', 'text-danger']));
    expect(classes('sized')).not.toContain('[:where(&)]:size-6');
    fixture.componentInstance.size.set('xl');
    await fixture.whenStable();
    expect(classes('sized')).toEqual(expect.arrayContaining(['size-9', 'text-[36px]', 'text-danger']));
    expect(classes('sized')).not.toContain('size-4.5');
  });

  it('inline takes the box, font size and line height from its parent', async () => {
    const { fixture, classes } = await setup();
    fixture.componentInstance.size.set('inline');
    await fixture.whenStable();
    expect(classes('sized')).toEqual(
      expect.arrayContaining(['h-[inherit]', 'w-[inherit]', 'text-[length:inherit]', 'leading-[inherit]'])
    );
    expect(classes('sized')).not.toContain('leading-none');
  });

  it('inlines a registered SVG, filled with the text colour, with no ligature text or font', async () => {
    const { fixture, icon, classes } = await setup({ http: true });
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('assets/icons/wifi.svg')
      .flush('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24"/></svg>');
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    const svg = icon('svg').querySelector('svg')!;
    expect(svg).not.toBeNull();
    expect([svg.getAttribute('width'), svg.getAttribute('height'), svg.getAttribute('focusable')]).toEqual([
      '100%',
      '100%',
      'false'
    ]);
    expect(icon('svg').textContent).toBe('');
    expect(classes('svg')).toEqual(expect.arrayContaining(['fill-current', 'size-6']));
    expect(classes('svg')).not.toContain('font-icons');

    fixture.componentInstance.svg.set('bolt');
    await fixture.whenStable();
    http.expectOne('assets/icons/bolt.svg').flush('<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>');
    await new Promise((resolve) => setTimeout(resolve));
    expect(icon('svg').querySelectorAll('svg')).toHaveLength(1);
    expect(icon('svg').querySelector('circle')).not.toBeNull();
    http.verify();
  });
});
