import { TestBed } from '@angular/core/testing';
import SettingInputComponent from './setting-input.component';

describe('SettingInputComponent', () => {
  const setup = async (label: string) => {
    const fixture = TestBed.createComponent(SettingInputComponent);
    fixture.componentRef.setInput('label', label);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('gives its input a valid id (no spaces or brackets) that its label points at', async () => {
    const el = await setup('Batch Time (s)');
    const input = el.querySelector('input')!;
    expect(input.id).toBe('setting-batch-time-s-input');
    expect(el.querySelector('label')!.htmlFor).toBe(input.id);
    expect(input.labels?.[0]?.textContent?.trim()).toBe('Batch Time (s)');
  });

  it('clamps a typed value to its range', async () => {
    const fixture = TestBed.createComponent(SettingInputComponent);
    fixture.componentRef.setInput('label', 'Discard Percentage');
    fixture.componentRef.setInput('min', 0);
    fixture.componentRef.setInput('max', 100);
    fixture.componentInstance.onValueChange('250');
    expect(fixture.componentInstance.value()).toBe(100);
    fixture.componentInstance.onValueChange('-3');
    expect(fixture.componentInstance.value()).toBe(0);
  });
});
