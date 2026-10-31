import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NotificationAnnouncerService } from './notification-announcer.service';

describe('NotificationAnnouncerService', () => {
  let service: NotificationAnnouncerService;
  let create: ReturnType<typeof vi.fn>;
  let announce: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    create = vi.fn().mockReturnValue({ messageId: '1' });
    announce = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: NzNotificationService, useValue: { create } },
        { provide: LiveAnnouncer, useValue: { announce } }
      ]
    });
    service = TestBed.inject(NotificationAnnouncerService);
  });

  it('opens the nz-notification with the same arguments and returns its ref', () => {
    const ref = service.create('warning', 'Invalid Range', 'Pick both a start and end time.', { nzDuration: 8000 });
    expect(create).toHaveBeenCalledWith('warning', 'Invalid Range', 'Pick both a start and end time.', {
      nzDuration: 8000
    });
    expect(ref).toEqual({ messageId: '1' });
  });

  it('announces the title and text to screen readers', () => {
    service.create('error', 'Error', 'Router is disconnected');
    expect(announce).toHaveBeenCalledWith('Error. Router is disconnected', 'assertive');
  });

  it('announces just the title when the text is empty', () => {
    service.create('success', 'Preset Saved', '');
    expect(announce).toHaveBeenCalledWith('Preset Saved', 'assertive');
  });
});
