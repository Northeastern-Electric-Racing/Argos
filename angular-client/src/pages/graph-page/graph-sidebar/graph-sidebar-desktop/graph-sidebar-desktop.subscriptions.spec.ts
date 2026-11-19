import { ToastService } from 'src/ui/toast/toast.service';
import { UiDialogService } from 'src/ui/dialog/dialog.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { DataType } from 'src/utils/types.utils';
import GraphSidebarDesktopComponent from './graph-sidebar-desktop.component';

/** A car's worth of topics (~900), shaped like the real schema: BMS per-cell data dominates. */
function carTopics(): DataType[] {
  const names: string[] = [];
  for (const chip of ['Alpha', 'Beta']) {
    for (let seg = 1; seg <= 5; seg++) {
      const base = `BMS/PerCell/${chip}/${seg}`;
      for (const kind of ['Volts', 'S_Volts', 'Burning', 'CvS', 'OW']) {
        for (let cell = 1; cell <= 13; cell++) names.push(`${base}/${kind}/${cell}`);
      }
      for (let therm = 1; therm <= 7; therm++) names.push(`${base}/Therms/${therm}`);
      for (const reading of ['Vref2', 'Vres', 'Vanalog', 'Vdigital', 'SegTemp', 'DieTemp']) names.push(`${base}/${reading}`);
    }
  }
  for (const stat of ['Volts', 'Temp']) {
    for (const what of ['High_Value', 'High_Chip', 'High_Cell', 'Low_Value', 'Low_Chip', 'Low_Cell', 'Avg_Value']) {
      names.push(`BMS/Cells/${stat}_${what}`);
    }
  }
  for (let seg = 1; seg <= 5; seg++) names.push(`BMS/Segment_Temp/${seg}`, `BMS/Segment_Volt/${seg}`);
  for (const board of ['VCU', 'MPU', 'Calypso', 'DTI', 'Charger']) {
    for (let group = 1; group <= 4; group++) {
      for (let signal = 1; signal <= 5; signal++) names.push(`${board}/Group_${group}/Signal_${signal}`);
    }
  }
  return names.map((name) => ({ name, unit: 'V' }));
}

// The desktop sidebar's tree scrolls in 80vh of a 1080px screen, less the filter box; rows are 2px apart,
// parents 36px and leaves 30px (topic-tree.component.html).
const VIEW_HEIGHT = 828;
const PARENT_ROW = 38;
const LEAF_ROW = 32;

/** An IntersectionObserver for jsdom (which has no layout), laying rows out by the sidebar's row heights. */
class LayoutIntersectionObserver {
  static instances = new Set<LayoutIntersectionObserver>();
  readonly targets = new Map<Element, boolean | undefined>();
  constructor(readonly callback: IntersectionObserverCallback) {
    LayoutIntersectionObserver.instances.add(this);
  }
  observe(target: Element): void {
    this.targets.set(target, undefined);
  }
  unobserve(target: Element): void {
    this.targets.delete(target);
  }
  disconnect(): void {
    this.targets.clear();
    LayoutIntersectionObserver.instances.delete(this);
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

/** A row is hidden when any group it sits in follows a collapsed parent (the CSS rule in topic-tree.component.html). */
const displayed = (row: Element): boolean => {
  for (let group = row.closest('[role="group"]'); group; group = group.parentElement?.closest('[role="group"]') ?? null) {
    if (group.previousElementSibling?.getAttribute('aria-expanded') === 'false') return false;
  }
  return true;
};

/** Lays the tree's rows out top to bottom and tells each observer which targets entered or left the scroll area. */
function layout(host: HTMLElement, scrollTop: number): void {
  const boxes = new Map<Element, [number, number]>();
  let y = 0;
  for (const row of host.querySelectorAll('[role="treeitem"]')) {
    if (!displayed(row)) continue;
    const height = row.hasAttribute('aria-expanded') ? PARENT_ROW : LEAF_ROW;
    boxes.set(row, [y, y + height]);
    y += height;
  }
  for (const observer of LayoutIntersectionObserver.instances) {
    const entries: IntersectionObserverEntry[] = [];
    for (const [target, was] of observer.targets) {
      const box = boxes.get(target.closest('[role="treeitem"]')!);
      const isIntersecting = !!box && box[0] < scrollTop + VIEW_HEIGHT && box[1] > scrollTop;
      if (isIntersecting === was) continue;
      observer.targets.set(target, isIntersecting);
      entries.push({ target, isIntersecting } as IntersectionObserverEntry);
    }
    if (entries.length) observer.callback(entries, observer as unknown as IntersectionObserver);
  }
}

describe('GraphSidebarDesktopComponent topic subscriptions (~900 topics)', () => {
  let fixture: ComponentFixture<GraphSidebarDesktopComponent>;
  let storage: Storage;
  const topics = carTopics();
  const original = globalThis.IntersectionObserver;

  /** Topics with at least one live storage reader. */
  const live = () => topics.filter((t) => storage.get(t.name).observed).length;
  /** Lays the sidebar out at `scrollTop` and lets the rows react. */
  const rowCount = (): number => fixture.nativeElement.querySelectorAll('[role="treeitem"]').length;
  // Angular Aria renders a branch's rows only once it is open (and drops them when it closes), a pass after the
  // click, so settle until the row count stops changing. Clear Topics sets node.expanded, which takes two passes,
  // so skip the no-changes check.
  const render = async (scrollTop = 0) => {
    let count = -1;
    while (count !== rowCount()) {
      count = rowCount();
      fixture.detectChanges(false);
      await fixture.whenStable();
    }
    layout(fixture.nativeElement, scrollTop);
    fixture.detectChanges(false);
    await fixture.whenStable();
  };
  const rows = (): HTMLElement[] => [...fixture.nativeElement.querySelectorAll('[role="treeitem"]')];
  /** Opens a branch as a user would, by clicking its row. */
  const open = async (label: string) => {
    rows()
      .find((r) => r.getAttribute('aria-expanded') === 'false' && r.querySelector('.flex-1')?.textContent?.trim() === label)!
      .click();
    await render();
  };
  const openAll = async () => {
    for (let closed = rows().find((r) => r.getAttribute('aria-expanded') === 'false'); closed; ) {
      closed.click();
      await render();
      closed = rows().find((r) => r.getAttribute('aria-expanded') === 'false');
    }
  };
  const rowValue = (topic: string) => rows().find((r) => r.textContent?.includes(topic))?.textContent;

  beforeEach(async () => {
    Element.prototype.scrollIntoView ??= () => undefined;
    globalThis.IntersectionObserver = LayoutIntersectionObserver as unknown as typeof IntersectionObserver;
    await TestBed.configureTestingModule({
      imports: [GraphSidebarDesktopComponent],
      providers: [ToastService, UiDialogService]
    }).compileComponents();
    storage = TestBed.inject(Storage);
    fixture = TestBed.createComponent(GraphSidebarDesktopComponent);
    fixture.componentRef.setInput('dataTypes', topics);
    await render();
  });

  afterEach(() => {
    globalThis.IntersectionObserver = original;
    LayoutIntersectionObserver.instances.clear();
  });

  it('has a realistic tree', () => {
    expect(topics.length).toBe(904);
    expect(fixture.componentInstance.flatNodes().length).toBe(904);
  });

  it('reads only the topics of rows on screen, in tree and flat mode', async () => {
    const counts: Record<string, number> = {};
    // Angular Aria leaves a collapsed branch's rows out of the DOM, so collapsing already drops their readers.
    counts['leaf rows in the DOM, collapsed'] = fixture.nativeElement.querySelectorAll('topic-value').length;
    counts['tree, collapsed'] = live();

    // BMS > PerCell > Alpha > 1 > Volts, a typical drill-down.
    for (const label of ['BMS', 'PerCell', 'Alpha', '1', 'Volts']) await open(label);
    counts['tree, one drill-down'] = live();

    await openAll();
    counts['leaf rows in the DOM, all expanded'] = fixture.nativeElement.querySelectorAll('topic-value').length;
    counts['tree, all expanded, top'] = live();
    await render(12000);
    counts['tree, all expanded, scrolled'] = live();
    fixture.componentInstance.clearSelections();
    await render();
    counts['tree, collapsed again'] = live();

    fixture.componentInstance.toggleFlattenMode(true);
    await render();
    counts['flat, top'] = live();
    await render(14000);
    counts['flat, scrolled'] = live();

    process.stdout.write('\n' + '[#988] live storage.get subscriptions: ' + JSON.stringify(counts) + '\n');
    // 828px holds 25 full leaf rows, plus one cut off at the bottom; develop read all 904 topics in every case.
    const onScreen = Math.ceil(VIEW_HEIGHT / LEAF_ROW);
    expect(counts['leaf rows in the DOM, collapsed']).toBe(0);
    expect(counts['leaf rows in the DOM, all expanded']).toBe(904);
    expect(counts['tree, collapsed']).toBe(0);
    expect(counts['tree, collapsed again']).toBe(0);
    for (const scenario of ['tree, one drill-down', 'tree, all expanded, top', 'tree, all expanded, scrolled']) {
      expect(counts[scenario]).toBeGreaterThan(0);
      expect(counts[scenario]).toBeLessThanOrEqual(onScreen);
    }
    expect(counts['flat, top']).toBe(onScreen);
    expect(counts['flat, scrolled']).toBeLessThanOrEqual(onScreen + 1);
  }, 60_000); // opening all ~130 branches one click at a time

  it('shows the latest value at once on a row scrolled back into view', async () => {
    fixture.componentInstance.toggleFlattenMode(true);
    await render(14000);
    const offScreen = 'BMS/Cells/Temp_Avg_Value';
    storage.addValue(offScreen, { values: ['42'], time: '0', unit: 'C' });
    await render(0);
    process.stdout.write('\n' + '[#988] row back in view shows: ' + rowValue(offScreen) + '\n');
    expect(rowValue(offScreen)).toContain('42.000C');
  });
});
