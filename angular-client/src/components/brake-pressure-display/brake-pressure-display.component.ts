import { Component, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import TypographyComponent from '../typography/typography.component';

@Component({
  selector: 'brake-pressure-display',
  templateUrl: './brake-pressure-display.component.html',
  styleUrls: ['./brake-pressure-display.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent]
})
export default class BrakePressureDisplayComponent implements OnInit {
  private storage = inject(Storage);
  brakePressure: number = 0;

  ngOnInit() {
    this.storage.get(topics.brakePressure()).subscribe((value) => {
      this.brakePressure = parseInt(value.values[0]);
    });
  }
}
