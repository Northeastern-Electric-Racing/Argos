import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { TuiButton, TuiCarousel, type TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { Run } from 'src/utils/types.utils';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import TypographyComponent from '../typography/typography.component';

// the data for the dialog: all the runs, and what to do with the one picked
export interface DialogData {
  runs: Run[];
  selectRun: (run: Run) => void;
}

@Component({
  selector: 'carousel',
  templateUrl: 'carousel.component.html',
  styleUrls: ['carousel.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TuiCarousel, TuiButton, MatGridList, MatGridTile, TypographyComponent]
})
export class CarouselComponent {
  readonly context = injectContext<TuiDialogContext<void, DialogData>>();
  runs: Run[] = this.context.data.runs;
  // Taiga's carousel loops with an unbounded index, so map it back onto the runs
  index = signal(0);

  runAt(index: number): Run | undefined {
    const count = this.runs.length;
    return count ? this.runs[((index % count) + count) % count] : undefined;
  }

  selectRun(run: Run) {
    this.context.completeWith();
    this.context.data.selectRun(run);
  }

  datePipe = (date: Date) => {
    date = new Date(date);
    return `${date.toLocaleString()}`;
  };
}
