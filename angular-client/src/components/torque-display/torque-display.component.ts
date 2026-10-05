import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import TypographyComponent from '../typography/typography.component';
import HStackComponent from '../hstack/hstack.component';

@Component({
  selector: 'torque-display',
  templateUrl: './torque-display.component.html',
  styleUrls: ['./torque-display.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent, HStackComponent]
})
export default class TorqueDisplayComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  torque: number = 0;

  ngOnInit() {
    this.storage
      .get(topics.torque())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.torque = parseInt(value.values[0]);
      });
  }
}
