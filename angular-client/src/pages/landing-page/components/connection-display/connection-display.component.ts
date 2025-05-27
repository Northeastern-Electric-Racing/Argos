import { Component, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';

import { ConnectionDotWithMessageComponent } from '../../../../components/connection-dot-with-message/connection-dot-with-message.component';
import TypographyComponent from 'src/components/typography/typography.component';

@Component({
  selector: 'connection-display',
  templateUrl: './connection-display.component.html',
  styleUrl: './connection-display.component.css',
  standalone: true,
  imports: [InfoBackgroundComponent, ConnectionDotWithMessageComponent, TypographyComponent]
})
export default class ConnectionDisplayComponent implements OnInit {
  private storage = inject(Storage);
  connected: boolean = false;

  ngOnInit() {
    this.storage.getCurrentRunId().subscribe((runId) => {
      this.connected = runId !== undefined;
    });
  }

  getConnectedStatus = (): string => {
    return this.connected ? 'Connected' : 'Disconnected';
  };

  getConnectedColor = (): string => {
    return this.connected ? 'green' : 'red';
  };
}
