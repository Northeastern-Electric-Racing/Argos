import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import { ConnectionDotWithMessageComponent } from '../../../../components/connection-dot-with-message/connection-dot-with-message.component';
import TypographyComponent from 'src/components/typography/typography.component';
import VStackComponent from 'src/components/vstack/vstack.component';

@Component({
  selector: 'bms-overflow',
  templateUrl: './bms-overflow.component.html',
  styleUrl: './bms-overflow.component.css',
  standalone: true,
  imports: [InfoBackgroundComponent, ConnectionDotWithMessageComponent, TypographyComponent, VStackComponent]
})
export class BmsOverflowComponent implements OnInit, OnDestroy {
  storage = inject(Storage);
  private subscriptions: Subscription[] = [];
  overflowID: number | undefined = undefined;

  ngOnInit(): void {
    this.subscriptions.push(
      this.storage.get(topics.perCellOverflowId()).subscribe((value) => {
        if (parseFloat(value.time) > Date.now() - 4000) {
          this.overflowID = parseInt(value.values[0]);
        } else {
          this.overflowID = undefined;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  getStatusColor = (): string => {
    const dotColor = this.overflowID === undefined ? '#19ff30' : 'red';
    return dotColor;
  };

  getStatusMessage = (): string => {
    return this.overflowID === undefined ? 'Clear' : 'Warning!';
  };
}
