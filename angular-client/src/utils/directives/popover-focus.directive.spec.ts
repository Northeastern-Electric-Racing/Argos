import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Popover } from 'primeng/popover';
import { PopoverFocusDirective } from './popover-focus.directive';

@Component({
  imports: [Popover, PopoverFocusDirective],
  template: `
    <button type="button" id="trigger">Custom</button>
    <button type="button" id="elsewhere">Elsewhere</button>
    <p-popover argosPopoverFocus />
  `
})
class HostComponent {
  popover = viewChild.required(Popover);
}

describe('PopoverFocusDirective', () => {
  let popover: Popover;
  let trigger: HTMLButtonElement;
  let content: HTMLDivElement;
  const tick = () => new Promise((resolve) => setTimeout(resolve));

  // Stand in for the overlay PrimeNG appends to <body> on show
  const show = async () => {
    content = document.createElement('div');
    content.innerHTML = '<button type="button" disabled>Off</button><input id="hours" /><input id="minutes" />';
    document.body.appendChild(content);
    popover.target = trigger;
    popover.container = content;
    popover.onShow.emit(null);
    await tick();
  };
  // As in PrimeNG: onHide fires while the overlay (and whatever has focus in it) is still on the page
  const hide = () => {
    popover.onHide.emit({});
    content.remove();
  };

  beforeEach(() => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    popover = fixture.componentInstance.popover();
    trigger = fixture.nativeElement.querySelector('#trigger');
    trigger.focus();
  });

  it('turns off PrimeNG focus-on-show, which would chase the [autofocus] PrimeNG 21 puts on every control', () => {
    expect(popover.focusOnShow).toBe(false);
  });

  it('moves focus to the first enabled field when the popover opens', async () => {
    await show();
    expect(document.activeElement?.id).toBe('hours');
  });

  it('returns focus to the trigger when the popover closes with focus inside it', async () => {
    await show();
    hide();
    expect(document.activeElement).toBe(trigger);
  });

  it('leaves focus alone when the popover closes because the user moved elsewhere', async () => {
    await show();
    const elsewhere = document.getElementById('elsewhere')!;
    elsewhere.focus();
    hide();
    expect(document.activeElement).toBe(elsewhere);
  });
});
