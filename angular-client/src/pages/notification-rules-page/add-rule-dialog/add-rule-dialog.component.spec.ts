import { TestBed } from '@angular/core/testing';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { BehaviorSubject } from 'rxjs';
import APIService from 'src/services/api.service';
import { QueryResponse } from 'src/utils/api.utils';
import { AddRuleDialogComponent } from './add-rule-dialog.component';

describe('AddRuleDialogComponent', () => {
  it('renders its button labels', async () => {
    const apiServiceMock: Pick<APIService, 'query'> = {
      query: <T>() => ({ data: new BehaviorSubject(null) }) as unknown as QueryResponse<T>
    };
    await TestBed.configureTestingModule({
      imports: [AddRuleDialogComponent],
      providers: [
        { provide: DynamicDialogRef, useValue: { close: () => {} } },
        { provide: APIService, useValue: apiServiceMock }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AddRuleDialogComponent);
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button[type]'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Cancel', 'Add Rule']);
  });
});
