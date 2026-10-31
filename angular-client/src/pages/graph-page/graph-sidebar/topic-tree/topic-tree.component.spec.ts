import { Tree } from '@angular/aria/tree';
import { TreeHarness } from '@angular/aria/tree/testing';
import { By } from '@angular/platform-browser';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreeNode, TreeNodeData } from 'src/utils/tree.utils';
import { TopicTreeComponent } from './topic-tree.component';

const leaf = (key: string, label: string): TreeNode<TreeNodeData> => ({
  key,
  label,
  selectable: true,
  data: { displayValue: signal('1') } as unknown as TreeNodeData
});
const branch = (key: string, children: TreeNode<TreeNodeData>[]): TreeNode<TreeNodeData> => ({
  key,
  label: key,
  selectable: false,
  children
});

describe('TopicTreeComponent', () => {
  let fixture: ComponentFixture<TopicTreeComponent>;
  let selected: string[];
  let unselected: string[];

  beforeEach(async () => {
    Element.prototype.scrollIntoView ??= () => undefined;
    fixture = TestBed.createComponent(TopicTreeComponent);
    fixture.componentRef.setInput('nodes', [
      branch('BMS', [leaf('BMS/Pack/Voltage', 'Voltage'), leaf('BMS/Status/Temp_Average', 'Temp_Average')])
    ]);
    fixture.componentRef.setInput('selectedKeys', ['BMS/Status/Temp_Average']);
    selected = [];
    unselected = [];
    fixture.componentInstance.nodeSelect.subscribe((k) => selected.push(k));
    fixture.componentInstance.nodeUnselect.subscribe((k) => unselected.push(k));
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  const tree = () => TestbedHarnessEnvironment.loader(fixture).getHarness(TreeHarness);
  const filter = async (term: string) => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    input.value = term;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  it('renders topics as an Aria tree, with selection from selectedKeys', async () => {
    const [bms] = await (await tree()).getItems({ text: /BMS/ });
    await bms.click();
    const items = await (await tree()).getItems({ level: 2 });
    expect(items.length).toBe(2);
    expect(await items[1].isSelected()).toBe(true);
    expect(await items[0].isSelected()).toBe(false);
  });

  it('emits nodeSelect when a leaf is clicked', async () => {
    await (await (await tree()).getItems({ text: /BMS/ }))[0].click();
    await (await (await tree()).getItems({ text: /Voltage/ }))[0].click();
    expect(selected).toEqual(['BMS/Pack/Voltage']);
    expect(unselected).toEqual([]);
  });

  it('filters to matching leaves, keeping their branch open', async () => {
    await filter('volt');
    const items = await (await tree()).getItems({ text: /Voltage|Temp_Average/ });
    expect(items.length).toBe(1);
    await items[0].click();
    expect(selected).toEqual(['BMS/Pack/Voltage']);
  });

  it('never reports a selected leaf the filter hides as unselected, even if the tree drops it', async () => {
    await filter('volt');
    // What the tree would emit if it pruned values it has no visible item for.
    fixture.debugElement.query(By.directive(Tree)).injector.get(Tree).value.set(['BMS/Pack/Voltage']);
    await fixture.whenStable();
    expect(selected).toEqual(['BMS/Pack/Voltage']);
    expect(unselected).toEqual([]);
  });

  it('reports a visible leaf the tree drops as unselected', async () => {
    fixture.debugElement.query(By.directive(Tree)).injector.get(Tree).value.set([]);
    await fixture.whenStable();
    expect(unselected).toEqual(['BMS/Status/Temp_Average']);
  });

  it('shows an empty state when nothing matches', async () => {
    await filter('zzz');
    expect(fixture.nativeElement.textContent).toContain('No topics found');
  });
});
