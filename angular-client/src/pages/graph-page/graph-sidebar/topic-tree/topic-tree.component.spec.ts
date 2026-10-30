import { Injector } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { dataTypesToNodes } from 'src/utils/dataTypes.utils';
import { mapNodesToTreeNodes, TreeNode, TreeNodeData } from 'src/utils/tree.utils';
import { DataType } from 'src/utils/types.utils';
import { TopicTreeComponent } from './topic-tree.component';

describe('TopicTreeComponent', () => {
  let fixture: ComponentFixture<TopicTreeComponent>;
  let nodes: TreeNode<TreeNodeData>[];

  const dataTypes: DataType[] = [
    { name: 'BMS/Pack/Voltage', unit: 'V' },
    { name: 'BMS/Pack/SoC', unit: '%' },
    { name: 'MPU/State/Speed', unit: 'mph' }
  ];

  const rowLabels = () =>
    Array.from(fixture.nativeElement.querySelectorAll('mat-tree-node .node-label') as NodeListOf<HTMLElement>).map((el) =>
      el.textContent?.trim()
    );

  const typeFilter = async (value: string) => {
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TopicTreeComponent] }).compileComponents();
    nodes = mapNodesToTreeNodes(dataTypesToNodes(dataTypes), TestBed.inject(Storage), TestBed.inject(Injector));
    fixture = TestBed.createComponent(TopicTreeComponent);
    fixture.componentRef.setInput('nodes', nodes);
    await fixture.whenStable();
  });

  it('starts collapsed', () => {
    expect(rowLabels()).toEqual(['BMS', 'MPU']);
  });

  it('filtering opens every branch down to the matching topic', async () => {
    await typeFilter('volt');
    expect(rowLabels()).toEqual(['BMS', 'Pack', 'Voltage']);
  });

  it('clearing the filter restores the branches the user had open', async () => {
    nodes[1].expanded = true; // MPU
    fixture.componentRef.setInput('nodes', [...nodes]);
    await fixture.whenStable();

    await typeFilter('volt');
    await typeFilter('');

    expect(rowLabels()).toEqual(['BMS', 'MPU', 'State']);
    const chevrons = Array.from(
      fixture.nativeElement.querySelectorAll('mat-tree-node .chevron') as NodeListOf<HTMLElement>
    ).map((el) => el.classList.contains('open'));
    expect(chevrons).toEqual([false, true, false]);
  });
});
