import { Component, OnInit, inject } from '@angular/core';
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
  private storage = inject(Storage);
  torque: number = 0;

  ngOnInit() {
    this.storage.get(topics.torque()).subscribe((value) => {
      this.torque = parseInt(value.values[0]);
    });
  }
}
