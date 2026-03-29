import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { floatPipe } from 'src/utils/pipes.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';
import VStackComponent from 'src/components/vstack/vstack.component';

enum BMSMODE {
  DEFAULT = 0,
  READY = 1,
  CHARGING = 2,
  FAULTED = 3
}

@Component({
  selector: 'BMS-mode-display',
  templateUrl: './BMS-mode-display.component.html',
  styleUrls: ['./BMS-mode-display.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent, VStackComponent]
})
export default class BMSModeDisplayComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];
  bmsMode: BMSMODE = 1;

  private colorMap: { [key in BMSMODE]: string } = {
    [BMSMODE.DEFAULT]: 'grey',
    [BMSMODE.READY]: 'blue',
    [BMSMODE.CHARGING]: 'green',
    [BMSMODE.FAULTED]: 'red'
  };

  ngOnInit() {
    this.subscriptions.push(
      this.storage.get(topics.bmsMode()).subscribe((value) => {
        this.bmsMode = floatPipe(value.values[0]) as BMSMODE;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  getBMSModeString(): string {
    return BMSMODE[this.bmsMode];
  }

  getStatusColor(): string {
    return this.colorMap[this.bmsMode];
  }
}
