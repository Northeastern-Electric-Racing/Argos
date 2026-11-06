import { UiDialogService } from 'src/ui/dialog/dialog.service';
import { Component, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { GraphDialogComponent } from '../graph-dialog/graph-dialog.component';
import { GraphData } from 'src/utils/types.utils';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import { GraphComponent } from '../graph/graph.component';
import TypographyComponent from '../typography/typography.component';
import { tw } from 'src/ui/recipes/tw';

@Component({
  selector: 'info-graph',
  templateUrl: './info-graph.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InfoBackgroundComponent, GraphComponent, TypographyComponent]
})
export class InfoGraphComponent {
  public dialogService = inject(UiDialogService);
  data = input.required<GraphData[]>();
  icon = input.required<string>();
  title = input.required<string>();
  color = input.required<string>();
  subTitle = input<string | undefined>(undefined);
  graphContainerId = input.required<string>();
  /**
   * The hint and the graph are one real button (the card's own click handler is a div, out of reach of the
   * keyboard), laid out as the card laid them out: a full-width block at the card's 16px font.
   */
  protected readonly opener = tw('block w-full rounded-sm p-0 text-left font-sans text-base focus-visible:focus-ring');
  openDialog = () => {
    this.dialogService.open(GraphDialogComponent, {
      header: this.title(),
      data: {
        data: this.data(),
        color: this.color(),
        title: this.title(),
        subTitle: this.subTitle(),
        graphContainerId: this.graphContainerId() + 'big'
      },
      dismissableMask: true // enables auto-close on outside click
    });
  };
}
