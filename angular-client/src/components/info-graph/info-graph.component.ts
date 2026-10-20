import { Component, inject, input, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { GraphDialogComponent } from '../graph-dialog/graph-dialog.component';
import { GraphData } from 'src/utils/types.utils';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import { GraphComponent } from '../graph/graph.component';

@Component({
  selector: 'info-graph',
  templateUrl: './info-graph.component.html',
  styleUrls: ['./info-graph.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InfoBackgroundComponent, GraphComponent]
})
export class InfoGraphComponent {
  private destroyRef = inject(DestroyRef);
  private readonly dialogs = inject(TuiDialogService);
  data = input.required<GraphData[]>();
  icon = input.required<string>();
  title = input.required<string>();
  color = input.required<string>();
  subTitle = input<string | undefined>(undefined);
  graphContainerId = input.required<string>();
  openDialog = () => {
    this.dialogs
      .open<void>(new PolymorpheusComponent(GraphDialogComponent), {
        label: this.title(),
        size: null,
        data: {
          data: this.data(),
          color: this.color(),
          title: this.title(),
          subTitle: this.subTitle(),
          graphContainerId: this.graphContainerId() + 'big'
        }
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  };
}
