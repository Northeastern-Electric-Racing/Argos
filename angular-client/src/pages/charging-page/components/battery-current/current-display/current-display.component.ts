import { Component, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { InfoBackgroundComponent } from '../../../../../components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';

@Component({
  selector: 'current-display',
  templateUrl: './current-display.component.html',
  styleUrls: ['./current-display.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent]
})
export default class CurrentDisplayComponent implements OnInit {
  private storage = inject(Storage);
  amps: number = 0;

  ngOnInit() {
    this.storage.get(DataTypeEnum.CURRENT).subscribe((value) => {
      this.amps = parseFloat(value.values[0]);
    });
  }
}
