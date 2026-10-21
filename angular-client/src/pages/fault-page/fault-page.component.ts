import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Router } from '@angular/router';
import { appRoutes } from 'src/app/app-routes';
import { FaultService } from 'src/services/fault.service';
import { FaultData, FaultNode } from 'src/utils/types.utils';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { DatePipe } from '@angular/common';
import TypographyComponent from 'src/components/typography/typography.component';

@Component({
  selector: 'fault-page',
  styleUrls: ['./fault-page.component.css'],
  templateUrl: './fault-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatExpansionModule, MatTableModule, DatePipe, TypographyComponent]
})
export default class FaultPageComponent {
  private faultService = inject(FaultService);
  private router = inject(Router);
  readonly columns = ['name', 'occurredAt', 'lastSeen', 'expired'];

  // A signal, so the zoneless app re-renders when faults arrive.
  nodeArray = toSignal(
    this.faultService.getFaults().pipe(
      map((faults) => {
        const nodes = new Map<string, FaultNode>();
        faults.forEach((fault) => {
          if (nodes.has(fault.node)) {
            nodes.get(fault.node)?.data.push(fault);
          } else {
            nodes.set(fault.node, { node: fault.node, data: [fault] });
          }
        });
        return Array.from(nodes.values()).sort((a, b) => a.node.localeCompare(b.node));
      })
    ),
    { initialValue: [] as FaultNode[] }
  );

  onRowSelect = (fault: FaultData) => {
    this.faultService.selectFault(fault);
    this.navigateTo(appRoutes.faultsGraphRoute());
  };

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
