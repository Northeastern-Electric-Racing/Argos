import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ComboboxHarness } from '@angular/aria/combobox/testing';
import { ListboxHarness } from '@angular/aria/listbox/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';

import { SegmentSelectorComponent } from './segment-selector.component';

describe('SegmentSelectorComponent', () => {
  let component: SegmentSelectorComponent;
  let fixture: ComponentFixture<SegmentSelectorComponent>;
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };

  // The test DOM has no layout, so no scrollIntoView for the listbox's active option.
  beforeAll(() => (Element.prototype.scrollIntoView ??= () => undefined));

  beforeEach(async () => {
    router = { url: '/bms/segment/2', navigate: vi.fn(() => Promise.resolve(true)) };
    await TestBed.configureTestingModule({
      imports: [SegmentSelectorComponent],
      providers: [{ provide: Router, useValue: router }]
    }).compileComponents();

    fixture = TestBed.createComponent(SegmentSelectorComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  const trigger = (): HTMLElement => fixture.nativeElement.querySelector('[role=combobox]');

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('is named for its purpose, not the segment it shows', () => {
    expect(trigger().getAttribute('aria-label')).toBe('Segment');
    expect(trigger().textContent).toContain('Segment 2');
  });

  it('keeps its name when choosing a segment reuses the page for the new route', async () => {
    const combobox = await TestbedHarnessEnvironment.loader(fixture).getHarness(ComboboxHarness);
    await combobox.open();
    const options = await (await combobox.getPopupWidget(ListboxHarness)).getOptions();
    for (const option of options) if ((await option.getText()).startsWith('Segment 1')) await option.click();
    router.url = '/bms/segment/1';
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(trigger().textContent).toContain('Segment 1');
    expect(trigger().getAttribute('aria-label')).toBe('Segment');
  });
});
