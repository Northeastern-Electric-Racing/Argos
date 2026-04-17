import { Component, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { DividerComponent } from '../divider/divider';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import TypographyComponent from '../typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import VStackComponent from 'src/components/vstack/vstack.component';

@Component({
  selector: 'brake-pressure-display',
  templateUrl: './brake-pressure-display.component.html',
  styleUrls: ['./brake-pressure-display.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent, HStackComponent, VStackComponent, DividerComponent]
})
export default class BrakePressureDisplayComponent implements OnInit {
  private storage = inject(Storage);
  brakePressureFront: number = 0;
  brakePressureBack: number = 0;

  ngOnInit() {
    this.storage.get(topics.brakePressureFront()).subscribe((value) => {
      this.brakePressureFront = parseInt(value.values[0]);
    });
    this.storage.get(topics.brakePressureBack()).subscribe((value) => {
      this.brakePressureBack = parseInt(value.values[0]);
    });
  }
}
