import { Component, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { floatPipe } from 'src/utils/pipes.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';
import ThermometerComponent from 'src/components/thermometer/thermometer.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
  selector: 'pack-temp',
  templateUrl: './pack-temp.component.html',
  styleUrls: ['./pack-temp.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent, ThermometerComponent, HStackComponent]
})
export default class PackTempComponent implements OnInit {
  private storage = inject(Storage);
  packTemp: number = 0;

  ngOnInit() {
    this.storage.get(topics.packTemp()).subscribe((value) => {
      this.packTemp = floatPipe(value.values[0]);
    });
  }
}
