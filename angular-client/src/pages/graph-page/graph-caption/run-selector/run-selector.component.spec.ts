import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import APIService from 'src/services/api.service';
import { UiDialogService } from 'src/ui/dialog/dialog.service';
import { ToastService } from 'src/ui/toast/toast.service';
import { QueryResponse } from 'src/utils/api.utils';
import { Run } from 'src/utils/types.utils';
import { RunSelectorComponent } from './run-selector.component';

const runs: Run[] = [
  { id: 7, locationName: 'Boston', driverName: 'Ada', time: new Date(2026, 3, 1), notes: '' },
  { id: 8, locationName: 'NHMS', driverName: 'Grace', time: new Date(2026, 3, 2), notes: '' }
];

describe('RunSelectorComponent', () => {
  let fixture: ComponentFixture<RunSelectorComponent>;
  let data: BehaviorSubject<Run[] | null>;
  let error: BehaviorSubject<Error | null>;
  let selectRun: ReturnType<typeof vi.fn>;
  const settle = () => new Promise((resolve) => setTimeout(resolve));
  const dialog = () => document.querySelector<HTMLElement>('ui-dialog-container');

  beforeEach(async () => {
    data = new BehaviorSubject<Run[] | null>(runs);
    error = new BehaviorSubject<Error | null>(null);
    const api: Pick<APIService, 'query'> = {
      query: <T>() =>
        ({
          data,
          error,
          isLoading: new BehaviorSubject(false),
          isError: new BehaviorSubject(false)
        }) as unknown as QueryResponse<T>
    };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: APIService, useValue: api }] });
    selectRun = vi.fn();
    fixture = TestBed.createComponent(RunSelectorComponent);
    fixture.componentRef.setInput('selectRun', selectRun);
    document.body.appendChild(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  afterEach(() => TestBed.inject(UiDialogService).closeAll());

  const openDialog = async () => {
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    await settle();
  };

  it('opens a modal "Select a run to view" dialog with the runs in a carousel', async () => {
    expect(fixture.nativeElement.querySelector('button').textContent.trim()).toBe('Select Run');
    await openDialog();
    const el = dialog()!;
    expect(el.getAttribute('role')).toBe('dialog');
    expect(document.getElementById(el.getAttribute('aria-labelledby')!)?.textContent).toBe('Select a run to view');
    expect(el.querySelector('[aria-roledescription="carousel"]')?.textContent).toContain('Run #7');
  });

  it('passes the picked run back and closes', async () => {
    await openDialog();
    dialog()!.querySelector<HTMLButtonElement>('button[aria-label="Next run"]')!.click();
    await fixture.whenStable();
    [...dialog()!.querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => b.textContent?.includes('Select this Run'))!
      .click();
    await settle();
    expect(selectRun).toHaveBeenCalledWith(runs[1]);
    expect(dialog()).toBeNull();
  });

  it('closes on a click outside the dialog', async () => {
    await openDialog();
    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();
    await settle();
    expect(dialog()).toBeNull();
    expect(selectRun).not.toHaveBeenCalled();
  });

  it('shows the error in a toast when the runs fail to load', () => {
    const add = vi.spyOn(TestBed.inject(ToastService), 'add');
    error.next(new Error('offline'));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', detail: 'offline' }));
  });
});
