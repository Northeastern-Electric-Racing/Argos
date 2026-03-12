import { Component, OnInit } from '@angular/core';
import TypographyComponent from 'src/components/typography/typography.component';
import { ButtonComponent } from 'src/components/argos-button/argos-button.component';

const CLIENT_ID_KEY = 'notification_rules_client_id';

@Component({
  selector: 'notification-rules-page',
  templateUrl: './notification-rules-page.component.html',
  styleUrls: ['./notification-rules-page.component.css'],
  standalone: true,
  imports: [TypographyComponent, ButtonComponent]
})
export default class NotificationRulesPageComponent implements OnInit {
  clientId!: string;

  ngOnInit(): void {
    this.clientId = this.getOrCreateClientId();
  }

  onUpload = () => {
    // no-op for now
  };

  onDownload = () => {
    // no-op for now
  };

  private getOrCreateClientId(): string {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  }
}
