import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { appRoutes } from 'src/app/app-routes';
import { FaultService } from 'src/services/fault.service';
import { FaultData, FaultNode } from 'src/utils/types.utils';

import { Accordion, AccordionPanel, AccordionHeader, AccordionContent } from 'primeng/accordion';
import { Ripple } from 'primeng/ripple';
import { TableModule } from 'primeng/table';
import { DatePipe } from '@angular/common';
import TypographyComponent from 'src/components/typography/typography.component';

@Component({
  selector: 'fault-page',
  styleUrls: ['./fault-page.component.css'],
  templateUrl: './fault-page.component.html',
  standalone: true,
  imports: [Accordion, AccordionPanel, Ripple, AccordionHeader, AccordionContent, TableModule, DatePipe, TypographyComponent]
})
export default class FaultPageComponent implements OnInit {
  private faultService = inject(FaultService);
  private router = inject(Router);
  nodeArray: FaultNode[] = [];
  selectedFault: FaultData | undefined = undefined;

  ngOnInit() {
    this.faultService.getFaults().subscribe((faults) => {
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

  onRowSelect = () => {
    if (this.selectedFault) {
      this.faultService.selectFault(this.selectedFault);
      this.navigateTo(appRoutes.faultsGraphRoute());
    }
  };

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
