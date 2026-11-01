import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmFocusDirective } from './confirm-focus.directive';

@Component({
  imports: [ConfirmDialog, ConfirmFocusDirective],
  providers: [ConfirmationService],
  template: `
    <button type="button" id="opener">Clear All</button>
    <button type="button" id="elsewhere">Elsewhere</button>
    <p-confirmdialog argosConfirmFocus />
  `
})
class HostComponent {
  dialog = viewChild.required(ConfirmDialog);
}

describe('ConfirmFocusDirective', () => {
  let dialog: ConfirmDialog;
  let confirmation: ConfirmationService;
  let opener: HTMLButtonElement;

  beforeEach(() => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    dialog = fixture.componentInstance.dialog();
    confirmation = fixture.debugElement.injector.get(ConfirmationService);
    opener = fixture.nativeElement.querySelector('#opener');
    opener.focus();
  });

  it('returns focus to the element that asked for confirmation once the dialog closes', () => {
    confirmation.confirm({ message: 'Clear all sessions?' });
    // The dialog moves focus to its own buttons, which then go away
    (document.activeElement as HTMLElement).blur();

    dialog.onReject();

    expect(document.activeElement).toBe(opener);
  });

  it('skips an opener that is no longer on the page', () => {
    confirmation.confirm({ message: 'Delete this session?' });
    opener.remove();

    dialog.onAccept();

    expect(document.activeElement).not.toBe(opener);
  });
});
