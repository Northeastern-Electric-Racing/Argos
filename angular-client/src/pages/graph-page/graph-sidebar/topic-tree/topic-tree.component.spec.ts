import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { TopicTreeNode } from 'src/utils/tree.utils';
import { DataType, Node } from 'src/utils/types.utils';
import TopicTreeComponent from './topic-tree.component';

const node = (path: string, children: TopicTreeNode[] = []): TopicTreeNode => {
  const name = path.split('/').pop()!;
  const dataType: DataType = { name: path, unit: 'V' };
  return {
    title: name,
    key: path + '/',
    isLeaf: children.length === 0,
    selectable: children.length === 0,
    children,
    data: { name, topicName: path + '/', dataType, nodes: new BehaviorSubject<Node[]>([]), displayValue: signal('1.000V') }
  };
};

describe('TopicTreeComponent', () => {
  let fixture: ComponentFixture<TopicTreeComponent>;
  let topics: TopicSelectionService;
  const soc = node('BMS/SoC');
  const voltage = node('BMS/Voltage');
  const bms = node('BMS', [soc, voltage]);

  const items = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('[role="treeitem"]'));
  const option = (title: string): HTMLElement =>
    items()
      .find((el) => el.textContent?.includes(title))!
      .querySelector('nz-tree-node-option') as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TopicTreeComponent] }).compileComponents();
    topics = TestBed.inject(TopicSelectionService);
    topics.clearSelection();
    fixture = TestBed.createComponent(TopicTreeComponent);
    fixture.componentRef.setInput('nodes', [bms]);
    await fixture.whenStable();
  });

  it('renders an ARIA tree with only the collapsed top level', () => {
    expect(fixture.nativeElement.querySelector('[role="tree"]')).toBeTruthy();
    expect(items().map((el) => el.getAttribute('aria-expanded'))).toEqual(['false']);
  });

  it('opens a branch on click, and toggles a leaf topic', async () => {
    option('BMS').click();
    await fixture.whenStable();
    expect(items().length).toBe(3);

    option('SoC').click();
    await fixture.whenStable();
    expect(topics.isSelected(soc.data.dataType)).toBe(true);
    expect(items()[1].getAttribute('aria-selected')).toBe('true');

    option('SoC').click();
    await fixture.whenStable();
    expect(topics.isSelected(soc.data.dataType)).toBe(false);
  });

  it('opens the parents of selected topics', async () => {
    topics.addDataType(voltage.data.dataType);
    await fixture.whenStable();
    expect(items().length).toBe(3);
  });

  it('filters by the search value and opens the matching branch', async () => {
    fixture.componentRef.setInput('searchValue', 'volt');
    await fixture.whenStable();
    const rows = items().map((el) => el.textContent ?? '');
    expect(rows.length).toBe(2);
    expect(rows[0]).toContain('BMS');
    expect(rows[1]).toContain('Voltage');
  });
});
