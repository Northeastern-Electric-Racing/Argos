import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Router } from '@angular/router';
import { appRoutes } from 'src/app/app-routes';
import { FaultService } from 'src/services/fault.service';
import { FaultData, FaultNode } from 'src/utils/types.utils';

import { AccordionContent, AccordionGroup, AccordionPanel, AccordionTrigger } from '@angular/aria/accordion';
import { CdkTableModule } from '@angular/cdk/table';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { DatePipe } from '@angular/common';
import TypographyComponent from 'src/components/typography/typography.component';
import { cellClass, headerCellClass, rowClass, tableClass } from 'src/ui/recipes/table';
import { accordionClasses } from 'src/ui/recipes/accordion';
import { cellButtonClass } from 'src/ui/recipes/cell-button';
import { UiAccordionBodyDirective } from 'src/ui/accordion/accordion-body.directive';

function groupByNode(faults: FaultData[]): FaultNode[] {
  const nodes = new Map<string, FaultNode>();
  for (const fault of faults) {
    const node = nodes.get(fault.node);
    if (node) node.data.push(fault);
    else nodes.set(fault.node, { node: fault.node, data: [fault] });
  }
  return Array.from(nodes.values()).sort((a, b) => a.node.localeCompare(b.node));
}

@Component({
  selector: 'fault-page',
  templateUrl: './fault-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AccordionGroup,
    AccordionTrigger,
    AccordionPanel,
    AccordionContent,
    CdkTableModule,
    UiIconComponent,
    DatePipe,
    TypographyComponent,
    UiAccordionBodyDirective
  ]
})
export default class FaultPageComponent {
  private faultService = inject(FaultService);
  private router = inject(Router);
  /**
   * Faults grouped by CAN node, sorted by node. A signal under OnPush: new accordion items then render
   * in a reactive pass, so each trigger's [panel] reference resolves before it is checked.
   */
  readonly nodeArray = toSignal(this.faultService.getFaults().pipe(map(groupByNode)), { initialValue: [] });
  readonly columns = ['name', 'occurredAt', 'lastSeen', 'expired'];

  /**
   * The expanded panels, by node name, as p-accordion kept them (its `[value]`): a node that drops out of a
   * message and comes back keeps its panel open or closed. Every node starts closed, as on develop.
   */
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());

  protected setExpanded(node: string, open: boolean) {
    this.expanded.update((names) => {
      const next = new Set(names);
      if (open) next.add(node);
      else next.delete(node);
      return next;
    });
  }

  protected readonly accordion = accordionClasses;
  protected readonly cellButton = cellButtonClass;
  protected readonly table = tableClass();
  protected readonly th = headerCellClass('phone');
  protected readonly td = cellClass('phone');
  protected readonly row = rowClass({ striped: true, hover: true });

  /** Every socket message rebuilds the faults, so rows are matched by fault, not object, and keep their focus. */
  trackFault = (_: number, fault: FaultData) => `${fault.node}/${fault.name}`;

  onRowSelect = (fault: FaultData) => {
    this.faultService.selectFault(fault);
    this.navigateTo(appRoutes.faultsGraphRoute());
  };

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
