import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { ToastMessage, ToastService } from './toast.service';

describe('ToastService', () => {
  let opened: { message: ToastMessage; dismissed: Subject<void> }[];
  let service: ToastService;

  beforeEach(() => {
    opened = [];
    const snackBar = {
      openFromComponent: (_component: unknown, config: { data: ToastMessage }) => {
        const dismissed = new Subject<void>();
        opened.push({ message: config.data, dismissed });
        return { afterDismissed: () => dismissed };
      }
    };
    TestBed.configureTestingModule({ providers: [{ provide: MatSnackBar, useValue: snackBar }] });
    service = TestBed.inject(ToastService);
  });

  const dismissLast = () => {
    const last = opened[opened.length - 1];
    last.dismissed.next();
    last.dismissed.complete();
  };

  it('shows a toast raised while another is up once that one is dismissed', () => {
    service.add({ severity: 'warn', summary: 'Parse Warnings', detail: 'Row 1: bad' });
    service.add({ severity: 'error', summary: 'Parse Error' });
    expect(opened.map((o) => o.message.summary)).toEqual(['Parse Warnings']);

    dismissLast();
    expect(opened.map((o) => o.message.summary)).toEqual(['Parse Warnings', 'Parse Error']);
  });

  it('drops a repeat of a toast that is already waiting', () => {
    service.add({ severity: 'info', summary: 'First' });
    service.add({ severity: 'error', summary: 'Offline' });
    service.add({ severity: 'error', summary: 'Offline' });

    dismissLast();
    dismissLast();
    expect(opened.map((o) => o.message.summary)).toEqual(['First', 'Offline']);
  });
});
