import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { AccordionHarness } from '@angular/aria/accordion/testing';
import { AccordionContent, AccordionGroup, AccordionPanel, AccordionTrigger } from '@angular/aria/accordion';
import { UiAccordionBodyDirective } from './accordion-body.directive';

@Component({
  imports: [AccordionGroup, AccordionTrigger, AccordionPanel, AccordionContent, UiAccordionBodyDirective],
  template: `
    <div ngAccordionGroup (keydown)="reached.push($event.key)">
      <h3><span ngAccordionTrigger [panel]="one" [expanded]="true">One</span></h3>
      <div ngAccordionPanel #one="ngAccordionPanel">
        <ng-template ngAccordionContent>
          <div uiAccordionBody><button type="button" (click)="pressed = pressed + 1">Act</button></div>
        </ng-template>
      </div>
      <h3><span ngAccordionTrigger [panel]="two">Two</span></h3>
      <div ngAccordionPanel #two="ngAccordionPanel"><ng-template ngAccordionContent>Two</ng-template></div>
    </div>
  `
})
class HostComponent {
  pressed = 0;
  reached: string[] = [];
}

describe('UiAccordionBodyDirective', () => {
  const setup = async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const [one] = await TestbedHarnessEnvironment.loader(fixture).getAllHarnesses(AccordionHarness);
    const button = fixture.nativeElement.querySelector('[uiAccordionBody] button') as HTMLButtonElement;
    return { fixture, one, button };
  };
  const keydown = (target: HTMLElement, key: string) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };

  it("keeps the group's keys inside the panel: not prevented, no toggle, focus stays on the control", async () => {
    const { fixture, one, button } = await setup();
    for (const key of ['Enter', ' ', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) {
      button.focus();
      expect(keydown(button, key).defaultPrevented).toBe(false);
      await fixture.whenStable();
      expect(document.activeElement).toBe(button);
    }
    expect(await one.isExpanded()).toBe(true);
    expect(fixture.componentInstance.reached).toEqual([]);
  });

  it('lets every other key through to the page', async () => {
    const { fixture, button } = await setup();
    keydown(button, 'Escape');
    keydown(button, 'Tab');
    keydown(button, 'a');
    expect(fixture.componentInstance.reached).toEqual(['Escape', 'Tab', 'a']);
  });

  it("takes the recipe's body padding", async () => {
    const { fixture } = await setup();
    const body = fixture.nativeElement.querySelector('[uiAccordionBody]') as HTMLElement;
    expect([...body.classList].sort()).toEqual(['pb-4', 'px-5']);
  });

  it('still toggles from the trigger', async () => {
    const { one } = await setup();
    await one.collapse();
    expect(await one.isExpanded()).toBe(false);
  });
});
