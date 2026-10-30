import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { TuiAppearance, TuiButton, TuiCarousel, TuiCell, TuiIcon, TuiTitle, type TuiDialogContext } from '@taiga-ui/core';
import { TuiPager } from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';
import { injectContext } from '@taiga-ui/polymorpheus';
import { Run } from 'src/utils/types.utils';

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
  imports: [TuiAppearance, TuiButton, TuiCardLarge, TuiCarousel, TuiCell, TuiHeader, TuiIcon, TuiPager, TuiTitle]
})
export class CarouselComponent {
  readonly context = injectContext<TuiDialogContext<void, DialogData>>();
  runs: Run[] = this.context.data.runs;
  // Taiga's carousel loops with an unbounded index, so map it back onto the runs
  index = signal(0);
  // the run on screen, for the pager dots
  activeIndex = computed(() => this.wrap(this.index()));

  runAt(index: number): Run | undefined {
    return this.runs.length ? this.runs[this.wrap(index)] : undefined;
  }

  private wrap(index: number): number {
    const count = this.runs.length;
    return count ? ((index % count) + count) % count : 0;
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
