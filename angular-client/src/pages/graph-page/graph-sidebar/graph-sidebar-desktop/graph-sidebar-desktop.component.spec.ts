import { ToastService } from 'src/ui/toast/toast.service';
import { UiDialogService } from 'src/ui/dialog/dialog.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TreeHarness } from '@angular/aria/tree/testing';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { DataType } from 'src/utils/types.utils';
import GraphSidebarDesktopComponent from './graph-sidebar-desktop.component';

describe('GraphSidebarDesktopComponent', () => {
  let fixture: ComponentFixture<GraphSidebarDesktopComponent>;
  let component: GraphSidebarDesktopComponent;
  let topicService: TopicSelectionService;

  const soc: DataType = { name: 'BMS/Pack/SoC', unit: '%' };
  const speed: DataType = { name: 'MPU/State/Speed', unit: 'mph' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphSidebarDesktopComponent],
      providers: [ToastService, UiDialogService]
    }).compileComponents();

    topicService = TestBed.inject(TopicSelectionService);
    fixture = TestBed.createComponent(GraphSidebarDesktopComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('dataTypes', [soc]);
    fixture.detectChanges();
  });

  it('sizes the topic tree to its container', () => {
    const tree = (fixture.nativeElement as HTMLElement).querySelector('p-tree');
    expect(tree?.classList).toContain('w-full');
  });

  it('builds the tree from dataTypes', () => {
    expect(component.treeNodes().map((n) => n.label)).toEqual(['BMS']);
    expect(component.flatNodes().map((n) => n.data?.dataType.name)).toEqual(['BMS/Pack/SoC']);
  });

  it('rebuilds the tree and selection when dataTypes changes', () => {
    topicService.addDataType(speed);
    fixture.componentRef.setInput('dataTypes', [soc, speed]);
    fixture.detectChanges();

    expect(component.treeNodes().map((n) => n.label)).toEqual(['BMS', 'MPU']);
    expect(component.flatNodes().length).toBe(2);
    expect(component.selectedNodes()?.map((n) => n.data?.dataType.name)).toEqual(['MPU/State/Speed']);
  });

  it('collapses the tree on Clear Topics, even when the selection was already empty', async () => {
    Element.prototype.scrollIntoView ??= () => undefined;
    fixture.autoDetectChanges();
    const clear = () => {
      const button = [...fixture.nativeElement.querySelectorAll('button')].find(
        (b: HTMLButtonElement) => b.textContent?.trim() === 'Clear Topics'
      ) as HTMLButtonElement;
      button.click();
      return fixture.whenStable();
    };
    const bms = async () =>
      (await (await TestbedHarnessEnvironment.loader(fixture).getHarness(TreeHarness)).getItems({ text: /BMS/ }))[0];

    await clear();
    await (await bms()).click();
    expect(await (await bms()).isExpanded()).toBe(true);
    // Nothing is selected, so no input of the topic tree changes: only the tree's own re-check collapses it.
    await clear();
    expect(await (await bms()).isExpanded()).toBe(false);
  });
});
