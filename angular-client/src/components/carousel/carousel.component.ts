import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCarouselImports } from '@spartan-ng/helm/carousel';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import Autoplay from 'embla-carousel-autoplay';
import { Run } from 'src/utils/types.utils';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import TypographyComponent from '../typography/typography.component';

// the data for the dialog: all the runs, and what to do with the picked one
export interface DialogData {
  runs: Run[];
  selectRun: (run: Run) => void;
}

@Component({
  selector: 'carousel',
  // Lays out the dialog's header, body and footer the way the Dialog docs' dynamic component does.
  host: { class: 'grid gap-6 min-w-0' },
  templateUrl: 'carousel.component.html',
  styleUrls: ['carousel.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [HlmCarouselImports, HlmDialogImports, HlmButton, MatGridList, MatGridTile, TypographyComponent]
})
export class CarouselComponent {
  public dialogRef = inject(BrnDialogRef);
  private context = injectBrnDialogContext<DialogData>();
  public router = inject(Router);
  runs: Run[] = this.context.runs;
  /** Loops through runs, auto-advancing every 3s like the old carousel. */
  carouselOptions = { loop: true };
  plugins = [Autoplay({ delay: 3000, stopOnInteraction: true })];

  selectRun = (run: Run) => {
    this.dialogRef.close();
    this.context.selectRun(run);
  };

  datePipe = (date: Date) => {
    date = new Date(date);
    return `${date.toLocaleString()}`;
  };
}
