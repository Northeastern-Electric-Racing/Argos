import { ComponentFixture, TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { ToastService } from 'src/ui/toast/toast.service';
import { UiDialogService } from 'src/ui/dialog/dialog.service';
import { DataType } from 'src/utils/types.utils';
import GraphSidebarDesktopComponent from './graph-sidebar-desktop/graph-sidebar-desktop.component';

/** A topic list shaped like the car's (~900 topics, most under BMS/PerCell), from the names in topic.utils.ts. */
export function realisticDataTypes(): DataType[] {
  const names: string[] = [];
  for (const chip of ['Alpha', 'Beta'])
    for (let seg = 0; seg < 5; seg++) {
      for (const kind of ['Therms', 'Volts', 'S_Volts', 'Burning', 'CvS', 'OW'])
        for (let cell = 0; cell < 13; cell++) names.push(`BMS/PerCell/${chip}/${seg}/${kind}/${cell}`);
      for (const v of ['Vref2', 'Vres', 'Vanalog', 'Vdigital', 'SegTemp', 'DieTemp'])
        names.push(`BMS/PerCell/${chip}/${seg}/${v}`);
      for (let f = 0; f < 4; f++) names.push(`BMS/PerCell/${chip}/${seg}/Faults/${f}`);
    }
  for (let seg = 0; seg < 5; seg++)
    for (const kind of ['Segment_Temp', 'Segment_Volt', 'Segment_Total_Volt']) names.push(`BMS/${kind}/${seg}`);
  for (const v of ['High', 'Low', 'Avg'])
    for (const k of ['Volts', 'Temp']) for (const f of ['Chip', 'Cell', 'Value']) names.push(`BMS/Cells/${k}_${v}_${f}`);
  for (let i = 0; i < 16; i++) names.push(`VCU/eFuses/Fuse${i}/Current`);
  for (let i = 0; i < 12; i++) names.push(`VCU/Pedals/Voltages/ch_${i}`);
  for (let i = 0; i < 10; i++) names.push(`DTI/Temps/Temp_${i}`);
  for (let i = 0; i < 6; i++) names.push(`TPU/OnBoard/Metric_${i}`);
  names.push('VCU/CarState/speed', 'BMS/Status/Temp_Average', 'TPU/GPS/Location');
  return names.map((name) => ({ name, unit: 'V' }));
}

describe('graph sidebar live values', () => {
  let fixture: ComponentFixture<GraphSidebarDesktopComponent>;
  let storage: Storage;
  const dataTypes = realisticDataTypes();

  /** Topics this client reads; each step awaits whenStable, which runs the batched topic change. */
  const liveTopics = (): number => storage.getTopics().length;
  /** Clicks the rendered tree item labelled exactly `label`, as a user would, and lets the tree re-render. */
  const click = async (label: string) => {
    const items: HTMLElement[] = [...fixture.nativeElement.querySelectorAll('[role="treeitem"]')];
    const row = items.find((li) => li.querySelector('span.flex-1')?.textContent?.trim() === label);
    if (!row) throw new Error(`no rendered tree item ${label}`);
    row.click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    Element.prototype.scrollIntoView ??= () => undefined;
    await TestBed.configureTestingModule({
      imports: [GraphSidebarDesktopComponent],
      providers: [ToastService, UiDialogService]
    }).compileComponents();
    storage = TestBed.inject(Storage);
    fixture = TestBed.createComponent(GraphSidebarDesktopComponent);
    fixture.componentRef.setInput('dataTypes', dataTypes);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  // Pins Angular Aria destroying collapsed groups (DeferredContent, preserveContent false): rows exist only while
  // their parent is expanded, so a row's live value is the only subscription its topic needs.
  it('subscribes only the topics under expanded nodes, and releases them on collapse', async () => {
    const counts: Record<string, number> = { topics: dataTypes.length, collapsed: liveTopics() };
    await click('VCU');
    counts['VCU open'] = liveTopics();
    await click('eFuses');
    counts['VCU/eFuses open'] = liveTopics();
    await click('Fuse0');
    counts['VCU/eFuses/Fuse0 open'] = liveTopics();
    await click('VCU');
    counts['VCU closed again'] = liveTopics();
    fixture.componentInstance.toggleFlattenMode(true);
    await fixture.whenStable();
    counts['flat'] = liveTopics();
    fixture.componentInstance.toggleFlattenMode(false);
    await fixture.whenStable();
    counts['tree again'] = liveTopics();

    expect(counts['collapsed']).toBe(0);
    expect(counts['VCU/eFuses/Fuse0 open']).toBe(1);
    expect(counts['VCU closed again']).toBe(0);
    expect(counts['flat']).toBe(dataTypes.length);
    expect(counts['tree again']).toBe(0);
  });

  it("shows a row's latest value as soon as its parent is expanded when something else reads it, not N/A", async () => {
    const graph = storage.get('VCU/CarState/speed').subscribe();
    storage.addValue('VCU/CarState/speed', { values: ['12.5'], time: '0', unit: 'mph' });
    await click('VCU');
    await click('CarState');
    const row = [...fixture.nativeElement.querySelectorAll('[role="treeitem"]')].find(
      (li: HTMLElement) => li.querySelector('span.flex-1')?.textContent?.trim() === 'speed'
    ) as HTMLElement;
    expect(row.querySelector('topic-live-value')?.textContent?.trim()).toBe('12.500mph');
    graph.unsubscribe();
  });
});
