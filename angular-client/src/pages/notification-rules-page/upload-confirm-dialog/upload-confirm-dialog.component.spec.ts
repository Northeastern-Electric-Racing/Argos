import { TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { UploadConfirmDialogComponent } from './upload-confirm-dialog.component';

describe('UploadConfirmDialogComponent', () => {
  it('renders its button labels', async () => {
    await TestBed.configureTestingModule({
      imports: [UploadConfirmDialogComponent],
      providers: [
        { provide: DynamicDialogConfig, useValue: { data: { rules: [] } } },
        { provide: DynamicDialogRef, useValue: { close: () => {} } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(UploadConfirmDialogComponent);
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Cancel', 'Confirm Upload']);
  });
});
