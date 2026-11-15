import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import CellTempDisplayComponent from './cell-temp/cell-temp-display/cell-temp-display.component';
import HighLowCellDisplayComponent from './high-low-cell/high-low-cell-display/high-low-cell-display.component';
import PackVoltageDisplayComponent from './pack-voltage/pack-voltage-display/pack-voltage-display.component';
import CellTempGraphComponent from './cell-temp/cell-temp-graph/cell-temp-graph.component';
import HighLowCellGraphComponent from './high-low-cell/high-low-cell-graph/high-low-cell-graph.component';
import PackVoltageGraphComponent from './pack-voltage/pack-voltage-graph/pack-voltage-graph.component';

/**
 * Each graph card's reset button says which graph it clears (WCAG 2.4.6), on phones and desktops alike.
 * The card's "Open in graph" link sits beside it; every button in the card must be named.
 */
const cases: { component: Type<unknown>; name: string }[] = [
  { component: CellTempDisplayComponent, name: 'Reset the cell temperature graph' },
  { component: HighLowCellDisplayComponent, name: 'Reset the cell voltage graph' },
  { component: PackVoltageDisplayComponent, name: 'Reset the pack voltage graph' }
];

describe('charging graph reset buttons', () => {
  // The cards' names don't depend on their charts: the cards are tested without them.
  beforeEach(() => {
    for (const graph of [CellTempGraphComponent, HighLowCellGraphComponent, PackVoltageGraphComponent]) {
      TestBed.overrideComponent(graph, { set: { template: '', imports: [] } });
    }
  });

  for (const c of cases) {
    it(`names "${c.name}"`, () => {
      const fixture = TestBed.createComponent(c.component);
      fixture.detectChanges();
      const names = [...fixture.nativeElement.querySelectorAll('button')].map((b: HTMLButtonElement) =>
        b.getAttribute('aria-label')
      );
      expect(names).toContain(c.name);
      expect(names).not.toContain(null);
    });
  }
});
