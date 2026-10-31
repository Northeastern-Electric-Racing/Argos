import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiPopoverComponent } from './popover.component';

@Component({
  imports: [UiPopoverComponent],
  template: `
    <button class="trigger" (click)="pop.toggle($event)" [attr.aria-expanded]="pop.isOpen()">Open</button>
    <button class="elsewhere">Elsewhere</button>
    <ui-popover #pop ariaLabel="Range" (shown)="shown = shown + 1">
      @if (withField) {
        <input class="field" aria-label="Hours" />
      }
    </ui-popover>
  `
})
class Host {
  pop = viewChild.required(UiPopoverComponent);
  withField = true;
  shown = 0;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('UiPopoverComponent', () => {
  const setup = async (withField = true) => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.withField = withField;
    document.body.appendChild(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('.trigger');
    const open = async () => {
      trigger.focus();
      trigger.click();
      await fixture.whenStable();
      await settle();
    };
    return { fixture, trigger, open };
  };

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = '')));

  it('opens a labelled dialog panel and reports it on the trigger', async () => {
    const { fixture, trigger, open } = await setup();
    await open();
    const panel = document.querySelector<HTMLElement>('.ui-popover-panel')!;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-label')).toBe('Range');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.componentInstance.shown).toBe(1);
  });

  it('gives focus back to the trigger when it closes from inside', async () => {
    const { fixture, trigger, open } = await setup();
    await open();
    document.querySelector<HTMLElement>('.field')!.focus();
    fixture.componentInstance.pop().hide();
    await fixture.whenStable();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('leaves focus where an outside click put it', async () => {
    const { fixture, open } = await setup();
    await open();
    const elsewhere: HTMLButtonElement = fixture.nativeElement.querySelector('.elsewhere');
    elsewhere.focus();
    fixture.componentInstance.pop().hide();
    await fixture.whenStable();
    expect(document.activeElement).toBe(elsewhere);
  });

  it('focuses the panel itself when it has nothing tabbable', async () => {
    const { open } = await setup(false);
    await open();
    expect(document.activeElement).toBe(document.querySelector('.ui-popover-panel'));
  });
});
