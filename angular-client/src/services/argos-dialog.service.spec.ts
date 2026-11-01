import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogService } from 'primeng/dynamicdialog';
import { ArgosDialogConfig, ArgosDialogService, provideArgosDialogs } from './argos-dialog.service';

@Component({ template: '<button type="button">Inside</button>' })
class DialogBodyComponent {}

describe('ArgosDialogService', () => {
  let service: DialogService;
  let trigger: HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideArgosDialogs] });
    service = TestBed.inject(DialogService);
    trigger = document.createElement('button');
    trigger.textContent = 'Open';
    document.body.appendChild(trigger);
    trigger.focus();
  });

  afterEach(() => trigger.remove());

  it('is what components get when they inject DialogService', () => {
    expect(service).toBeInstanceOf(ArgosDialogService);
  });

  it('returns focus to the element that opened the dialog once it is gone', () => {
    const ref = service.open(DialogBodyComponent, { header: 'Test' })!;
    TestBed.inject(ApplicationRef).tick();
    const inside = [...document.querySelectorAll<HTMLButtonElement>('.p-dialog button')].find(
      (b) => b.textContent === 'Inside'
    )!;
    inside.focus();
    expect(document.activeElement).toBe(inside);

    ref.destroy();

    expect(document.activeElement).toBe(trigger);
  });

  // A popup menu item opens the dialog with the mouse, then the menu (and the focused item) goes away
  it('falls back to the given opener when the element that had focus is gone', () => {
    const menu = document.createElement('ul');
    menu.innerHTML = '<li tabindex="0">Edit Runs</li>';
    document.body.appendChild(menu);
    (menu.firstElementChild as HTMLElement).focus();

    const ref = service.open(DialogBodyComponent, { header: 'Test', opener: trigger } as ArgosDialogConfig)!;
    menu.remove();
    ref.destroy();

    expect(document.activeElement).toBe(trigger);
  });

  it('lets a dialog fill the viewport instead of PrimeNG 90% cap, keeping its own style', () => {
    const ref = service.open(DialogBodyComponent, { header: 'Test', style: { borderRadius: '12px' } })!;
    const config = service.getInstance(ref)!.ddconfig;

    expect(config.style).toEqual({ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px' });
    ref.destroy();
  });
});
