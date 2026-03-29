import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Button } from 'primeng/button';
import { NotificationLogService } from 'src/services/notification-log.service';
import { appRoutes } from 'src/app/app-routing.module';
import TypographyComponent from 'src/components/typography/typography.component';

@Component({
  selector: 'notification-dropdown',
  templateUrl: './notification-dropdown.component.html',
  styleUrls: ['./notification-dropdown.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, Button, TypographyComponent]
})
export class NotificationDropdownComponent {
  protected notificationLogService = inject(NotificationLogService);
  private router = inject(Router);

  viewAll(): void {
    this.notificationLogService.markAllRead();
    this.router.navigate([appRoutes.notificationLogRoute()]);
  }
}
