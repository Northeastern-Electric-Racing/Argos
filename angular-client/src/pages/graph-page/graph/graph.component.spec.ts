import { TestBed } from '@angular/core/testing';
import CustomGraphComponent from './graph.component';

// Regression coverage for #630: with "Multiple Y-Axes" on, the y-axis set must always
// match the currently selected topics. applyMultiYAxisConfigs is the seam that rebuilds
// options.yaxis from the current data map, and updateChart now calls it every render so
// deselecting a topic prunes its axis. These tests drive that seam directly (the full
// component needs ApexCharts + a live DOM chart container, out of scope for a unit test).
describe('CustomGraphComponent — multi y-axis sync (#630)', () => {
  function makeComponent(): CustomGraphComponent {
    const c = TestBed.createComponent(CustomGraphComponent).componentInstance;
    // applyMultiYAxisConfigs only reads `data` and writes `options.yaxis`.
    (c as unknown as { options: { yaxis: unknown[] } }).options = { yaxis: [] };
    return c;
  }

  function applyAxes(c: CustomGraphComponent): void {
    (c as unknown as { applyMultiYAxisConfigs: () => void }).applyMultiYAxisConfigs();
  }

  it('builds one y-axis per topic in the current data map', () => {
    const c = makeComponent();
    c.data = new Map([
      ['BMS/Pack/Voltage 0', []],
      ['BMS/Pack/Current 0', []]
    ]);

    applyAxes(c);

    expect(c.options.yaxis.length).toBe(2);
  });

  it('prunes a y-axis when its topic is deselected (removed from the data map)', () => {
    const c = makeComponent();
    c.data = new Map([
      ['BMS/Pack/Voltage 0', []],
      ['BMS/Pack/Current 0', []]
    ]);
    applyAxes(c);
    expect(c.options.yaxis.length).toBe(2);

    // Deselecting a topic removes its series from the data map...
    c.data.delete('BMS/Pack/Current 0');
    applyAxes(c);

    // ...so its y-axis must go too, leaving axes matched to the remaining series.
    expect(c.options.yaxis.length).toBe(1);
    expect((c.options.yaxis[0] as { title: { text: string } }).title.text).toBe('BMS/Pack/Voltage ');
  });

  it('alternates y-axis sides so stacked axes stay readable', () => {
    const c = makeComponent();
    c.data = new Map([
      ['A 0', []],
      ['B 0', []],
      ['C 0', []]
    ]);

    applyAxes(c);

    const sides = (c.options.yaxis as { opposite: boolean }[]).map((y) => y.opposite);
    expect(sides).toEqual([false, true, false]);
  });
});
