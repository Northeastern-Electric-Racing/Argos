import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MenuItem, TreeNode } from 'primeng/api';
import { Button } from 'primeng/button';
import { providePrimeNG } from 'primeng/config';
import { Menu } from 'primeng/menu';
import { ToggleButton } from 'primeng/togglebutton';
import { Tree } from 'primeng/tree';
import ArgosPt, { namedTreeToggles } from './argos-pt';

@Component({
  imports: [Button, ToggleButton, Menu, Tree, FormsModule],
  template: `
    <p-button label="Add" icon="pi pi-plus" />
    <p-togglebutton [(ngModel)]="on" onLabel="Topics" offLabel="Topics" onIcon="pi pi-list" offIcon="pi pi-list" />
    <p-menu [model]="items" />
    <p-tree [value]="nodes" [pt]="treePt" />
  `
})
class IconHostComponent {
  on = false;
  items: MenuItem[] = [{ label: 'Rename', icon: 'pi pi-pencil' }];
  nodes: TreeNode[] = [{ label: 'BMS', children: [{ label: 'Pack', leaf: true }] }];
  treePt = namedTreeToggles;
}

describe('ArgosPt', () => {
  let host: HTMLElement;
  let fixture: ComponentFixture<IconHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IconHostComponent],
      providers: [providePrimeNG({ pt: ArgosPt })]
    });
    fixture = TestBed.createComponent(IconHostComponent);
    fixture.detectChanges();
    host = fixture.nativeElement;
  });

  // PrimeIcons draw a private-use glyph in ::before, which Chrome adds to the button's accessible name
  it('hides Button icons', () => {
    expect(host.querySelector('p-button .p-button-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('hides ToggleButton icons', () => {
    expect(host.querySelector('p-togglebutton .p-togglebutton-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('hides Menu item icons', () => {
    expect(host.querySelector('p-menu .p-menu-item-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('names tree toggle buttons after their node and what a press does', () => {
    const toggle = () => host.querySelector('p-tree .p-tree-node-toggle-button')!;
    expect(toggle().getAttribute('aria-label')).toBe('Expand BMS');

    (toggle() as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(toggle().getAttribute('aria-label')).toBe('Collapse BMS');
  });
});
