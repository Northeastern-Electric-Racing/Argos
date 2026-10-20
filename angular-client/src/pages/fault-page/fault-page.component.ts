import { Component, inject, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { appRoutes } from 'src/app/app-routes';
import { FaultService } from 'src/services/fault.service';
import { FaultData, FaultNode } from 'src/utils/types.utils';

import { AccordionContent, AccordionGroup, AccordionPanel, AccordionTrigger } from '@angular/aria/accordion';
import { CdkTableModule } from '@angular/cdk/table';
import { MatIcon } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import TypographyComponent from 'src/components/typography/typography.component';

@Component({
  selector: 'fault-page',
  styleUrls: ['./fault-page.component.css'],
  templateUrl: './fault-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
export default class FaultPageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private faultService = inject(FaultService);
  private router = inject(Router);
  nodeArray: FaultNode[] = [];
  readonly columns = ['name', 'occurredAt', 'lastSeen', 'expired'];

  ngOnInit() {
    this.faultService
      .getFaults()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((faults) => {
        const nodes = new Map();
        faults.forEach((fault) => {
          if (nodes.has(fault.node)) {
            nodes.get(fault.node)?.data.push(fault);
          } else {
            nodes.set(fault.node, { node: fault.node, data: [fault] });
          }
        });
        this.nodeArray = Array.from(nodes.values()).sort((a, b) => a.node.localeCompare(b.node));
      });
  }

  onRowSelect = (fault: FaultData) => {
    this.faultService.selectFault(fault);
    this.navigateTo(appRoutes.faultsGraphRoute());
  };

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
