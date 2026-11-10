import { TestBed } from '@angular/core/testing';
import IndicatorLightComponent from './indicator-light.component';

describe('IndicatorLightComponent', () => {
  const setup = (active: boolean) => {
    const fixture = TestBed.createComponent(IndicatorLightComponent);
    fixture.componentRef.setInput('label', 'FAULTED');
    fixture.componentRef.setInput('active', active);
    fixture.detectChanges();
    return fixture;
  };
  const text = (el: HTMLElement) => el.textContent?.replace(/\s+/g, ' ').trim();

  // A lamp's state was only its colour (WCAG 1.4.1, 4.1.2): its text now says whether it is lit.
  it('reads its legend and whether it is lit', () => {
    const fixture = setup(false);
    expect(text(fixture.nativeElement)).toBe('FAULTED, off');

    fixture.componentRef.setInput('active', true);
    fixture.detectChanges();
    expect(text(fixture.nativeElement)).toBe('FAULTED, on');
  });

  it('keeps the legend itself readable by assistive tech', () => {
    const fixture = setup(true);
    expect(fixture.nativeElement.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
