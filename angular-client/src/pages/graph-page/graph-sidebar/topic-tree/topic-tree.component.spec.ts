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

  it('expands and collapses a branch, hiding its group when collapsed', async () => {
    const [bms] = await (await tree()).getItems({ text: /BMS/ });
    expect(await bms.isExpanded()).toBe(false);
    await bms.click();
    expect(await bms.isExpanded()).toBe(true);
    await bms.click();
    expect(await bms.isExpanded()).toBe(false);
  });

  it('selects several leaves without a modifier key, and unselects on a second click', async () => {
    await (await (await tree()).getItems({ text: /BMS/ }))[0].click();
    await (await (await tree()).getItems({ text: /Voltage/ }))[0].click();
    fixture.componentRef.setInput('selectedKeys', ['BMS/Status/Temp_Average', 'BMS/Pack/Voltage']);
    await fixture.whenStable();
    const items = await (await tree()).getItems({ level: 2 });
    expect(await Promise.all(items.map((i) => i.isSelected()))).toEqual([true, true]);
    await items[0].click();
    expect(unselected).toEqual(['BMS/Pack/Voltage']);
  });

  it('labels the filter box with its placeholder', () => {
    fixture.componentRef.setInput('filterPlaceholder', 'Select Data Type');
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    expect(input.getAttribute('aria-label')).toBe('Select Data Type');
    expect(input.placeholder).toBe('Select Data Type');
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

  it.each([{ ctrlKey: true }, { metaKey: true }])(
    'ignores select-all (%o + A) rather than graphing every visible topic',
    async (modifier) => {
      await (await (await tree()).getItems({ text: /BMS/ }))[0].click();
      const voltage: HTMLElement = fixture.nativeElement.querySelector('[role="treeitem"][aria-level="2"]');
      voltage.focus();
      voltage.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true, ...modifier }));
      await fixture.whenStable();
      expect(selected).toEqual([]);
      expect(unselected).toEqual([]);
    }
  );

  describe("blocks range selection (develop's tree had none)", () => {
    // Keys go to the focused item, as from a real keyboard; the tree's roving focus moves it.
    const press = (init: KeyboardEventInit) =>
      document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
    /** Opens BMS, walks down `anchorAt` rows and anchors a range there with Shift, then walks `then` more rows without it. */
    const anchorAndMove = async (anchorAt: number, then: number) => {
      const [bms] = await (await tree()).getItems({ text: /BMS/ });
      await bms.click();
      await bms.focus();
      for (let i = 0; i < anchorAt; i++) press({ key: 'ArrowDown' });
      press({ key: 'Shift', shiftKey: true });
      for (let i = 0; i < then; i++) press({ key: 'ArrowDown' });
      await fixture.whenStable();
    };

    // Each case would otherwise select Voltage along with Temp_Average: rows 0-2 are BMS, Voltage, Temp_Average.
    it.each([
      { anchorAt: 0, then: 1, init: { key: 'ArrowDown', shiftKey: true } },
      { anchorAt: 0, then: 2, init: { key: 'ArrowUp', shiftKey: true } },
      { anchorAt: 0, then: 2, init: { key: 'Enter', shiftKey: true } },
      { anchorAt: 0, then: 2, init: { key: ' ', shiftKey: true } },
      { anchorAt: 2, then: 0, init: { key: 'Home', shiftKey: true, ctrlKey: true } },
      { anchorAt: 2, then: 0, init: { key: 'Home', shiftKey: true, metaKey: true } },
      { anchorAt: 0, then: 0, init: { key: 'End', shiftKey: true, ctrlKey: true } },
      { anchorAt: 0, then: 0, init: { key: 'End', shiftKey: true, metaKey: true } }
    ])('ignores $init', async ({ anchorAt, then, init }) => {
      await anchorAndMove(anchorAt, then);
      press(init);
      await fixture.whenStable();
      expect(selected).toEqual([]);
      expect(unselected).toEqual([]);
    });

    it('ignores Shift+click', async () => {
      await anchorAndMove(0, 0);
      const [voltage] = await (await tree()).getItems({ text: /Voltage/ });
      await (await voltage.host()).click({ shift: true });
      await fixture.whenStable();
      expect(selected).toEqual([]);
      expect(unselected).toEqual([]);
    });
  });

  it('shows an empty state when nothing matches', async () => {
    await filter('zzz');
    expect(fixture.nativeElement.textContent).toContain('No topics found');
  });
});
