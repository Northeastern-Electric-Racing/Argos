import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UiDialogService } from 'src/ui/dialog/dialog.service';
import { appRoutes } from 'src/app/app-routes';
import { SegmentRowComponent } from './segment-row.component';

describe('SegmentRowComponent', () => {
  let fixture: ComponentFixture<SegmentRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SegmentRowComponent],
      providers: [{ provide: UiDialogService, useValue: {} }]
    }).compileComponents();
    fixture = TestBed.createComponent(SegmentRowComponent);
    fixture.componentRef.setInput('segment', 2);
    fixture.detectChanges();
  });

  const seeMore = (): HTMLButtonElement =>
    Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('See more')
    )!;

  it('offers "See more" as a real button whose icon is hidden from assistive tech', () => {
    const button = seeMore();
    expect(button.type).toBe('button');
    expect(button.textContent?.trim()).toMatch(/^See more/);
    expect(button.querySelector('mat-icon')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('opens the segment page from "See more"', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    seeMore().click();
    expect(navigate).toHaveBeenCalledWith([appRoutes.bmsSegmentViewRoute(2)]);
  });

  it('shows the current heat-map view in its view select, named for the segment', () => {
    const combobox: HTMLElement = fixture.nativeElement.querySelector('[role=combobox]');
    expect(combobox.textContent).toContain('C Volts');
    expect(combobox.getAttribute('aria-label')).toBe('Segment 3 heat map view');
  });
});
