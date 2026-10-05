import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  amps: number = 0;

  ngOnInit() {
    this.storage
      .get(topics.current())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.amps = parseFloat(value.values[0]);
      });
  }
}
