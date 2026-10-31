import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { providePrimeNG } from 'primeng/config';
import { Menu } from 'primeng/menu';
import { ToggleButton } from 'primeng/togglebutton';
import ArgosPt from './argos-pt';

@Component({
  imports: [Button, ToggleButton, Menu, FormsModule],
  template: `
    <p-button label="Add" icon="pi pi-plus" />
    <p-togglebutton [(ngModel)]="on" onLabel="Topics" offLabel="Topics" onIcon="pi pi-list" offIcon="pi pi-list" />
    <p-menu [model]="items" />
  `
})
class IconHostComponent {
  on = false;
  items: MenuItem[] = [{ label: 'Rename', icon: 'pi pi-pencil' }];
}

// PrimeIcons draw a private-use glyph in ::before, which Chrome adds to the button's accessible name
describe('ArgosPt: icon glyphs stay out of accessible names', () => {
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IconHostComponent],
      providers: [providePrimeNG({ pt: ArgosPt })]
    });
    const fixture = TestBed.createComponent(IconHostComponent);
    fixture.detectChanges();
    host = fixture.nativeElement;
  });

  it('hides Button icons', () => {
    expect(host.querySelector('p-button .p-button-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('hides ToggleButton icons', () => {
    expect(host.querySelector('p-togglebutton .p-togglebutton-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('hides Menu item icons', () => {
    expect(host.querySelector('p-menu .p-menu-item-icon')?.getAttribute('aria-hidden')).toBe('true');
  });
});
