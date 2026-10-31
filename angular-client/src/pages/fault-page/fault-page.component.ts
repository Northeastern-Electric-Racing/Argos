import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Router } from '@angular/router';
import { appRoutes } from 'src/app/app-routes';
import { FaultService } from 'src/services/fault.service';
import { FaultData, FaultNode } from 'src/utils/types.utils';

import { AccordionContent, AccordionGroup, AccordionPanel, AccordionTrigger } from '@angular/aria/accordion';
import { CdkTableModule } from '@angular/cdk/table';
import { MatIcon } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import TypographyComponent from 'src/components/typography/typography.component';

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
  styleUrls: ['./fault-page.component.css'],
  templateUrl: './fault-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AccordionGroup,
    AccordionTrigger,
    AccordionPanel,
    AccordionContent,
    CdkTableModule,
    MatIcon,
    DatePipe,
    TypographyComponent
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
