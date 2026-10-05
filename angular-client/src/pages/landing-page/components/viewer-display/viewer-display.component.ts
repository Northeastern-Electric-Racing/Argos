import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';

@Component({
  selector: 'viewer-display',
  templateUrl: './viewer-display.component.html',
  styleUrl: './viewer-display.component.css',
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent]
})
export class ViewerDisplayComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  numViewers: number = 0;

  ngOnInit() {
    this.storage
      .get(topics.viewers())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.numViewers = parseInt(value.values[0]);
      });
  }
}
