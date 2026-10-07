import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
export default class BMSModeDisplayComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  bmsMode: BMSMODE = 1;

  private colorMap: { [key in BMSMODE]: string } = {
    [BMSMODE.DEFAULT]: 'grey',
    [BMSMODE.READY]: 'blue',
    [BMSMODE.CHARGING]: 'green',
    [BMSMODE.FAULTED]: 'red'
  };

  ngOnInit() {
    this.storage
      .get(topics.bmsMode())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.bmsMode = floatPipe(value.values[0]) as BMSMODE;
      });
  }

  getBMSModeString(): string {
    return BMSMODE[this.bmsMode];
  }

  getStatusColor(): string {
    return this.colorMap[this.bmsMode];
  }
}
