import { Component, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
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
    this.storage.get(topics.current()).subscribe((value) => {
      this.amps = parseFloat(value.values[0]);
    });
  }
}
