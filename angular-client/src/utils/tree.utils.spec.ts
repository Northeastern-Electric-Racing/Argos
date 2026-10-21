import { signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  compactTopicLabel,
  filterSelectedNodes,
  filterTopicTree,
  findSelectedAncestors,
  flattenTreeNodes,
  TopicTreeNode
} from './tree.utils';
import { DataType, Node } from './types.utils';

const EMPTY_DISPLAY = signal('');

const leaf = (name: string, unit = ''): TopicTreeNode => {
  const dataType: DataType = { name, unit };
  return {
    title: name.split('/').pop()!,
    key: name + '/',
    isLeaf: true,
    selectable: true,
    children: [],
    data: {
      name: name.split('/').pop()!,
      topicName: name + '/',
      dataType,
      nodes: new BehaviorSubject<Node[]>([]),
      displayValue: EMPTY_DISPLAY
    }
  };
};

const branch = (name: string, children: TopicTreeNode[]): TopicTreeNode => ({
  title: name,
  key: name + '/',
  isLeaf: false,
  selectable: false,
  children,
  data: {
    name,
    topicName: name + '/',
    dataType: { name, unit: '' },
    nodes: new BehaviorSubject<Node[]>([]),
    displayValue: EMPTY_DISPLAY
  }
});

describe('compactTopicLabel', () => {
  it('returns the full path when it fits under the limit', () => {
    expect(compactTopicLabel('BMS/Pack/Voltage', 30)).toBe('BMS/Pack/Voltage');
    expect(compactTopicLabel('BMS/PerCell/Alpha/1/Burning/0', 30)).toBe('BMS/PerCell/Alpha/1/Burning/0');
  });

  it('drops front segments after the first to make the path fit', () => {
    expect(compactTopicLabel('BMS/PerCell/AlphaSomething/1/Burning/0', 30)).toBe('BMS...1/Burning/0');
  });

  it('keeps the longest tail that fits', () => {
    expect(compactTopicLabel('BMS/AAAA/B/C/D/E', 14)).toBe('BMS...B/C/D/E');
  });

  it('falls back to first...lastSegment when even that overflows', () => {
    expect(compactTopicLabel('VeryLongSystem/Mid/AlsoVeryLongLeaf', 5)).toBe('VeryLongSystem...AlsoVeryLongLeaf');
  });

  it('returns short paths unchanged when they have <= 2 segments', () => {
    expect(compactTopicLabel('Just/Two', 5)).toBe('Just/Two');
    expect(compactTopicLabel('Solo', 2)).toBe('Solo');
  });
});

describe('flattenTreeNodes', () => {
  it('returns only leaves, excluding branches', () => {
    const tree = [branch('BMS', [leaf('BMS/Pack/Voltage'), leaf('BMS/Pack/SoC')]), branch('MPU', [leaf('MPU/State/Speed')])];
    const flat = flattenTreeNodes(tree);
    expect(flat.length).toBe(3);
    flat.forEach((n) => expect(n.children?.length).toBe(0));
    flat.forEach((n) => expect(n.selectable).toBe(true));
  });

  it('keeps full labels when they fit under the default threshold', () => {
    const tree = [branch('BMS', [branch('Pack', [leaf('BMS/Pack/Voltage')])])];
    const flat = flattenTreeNodes(tree);
    expect(flat.length).toBe(1);
    expect(flat[0].title).toBe('BMS/Pack/Voltage');
  });

  it('compacts long paths using firstSegment...tail', () => {
    const tree = [branch('BMS', [leaf('BMS/PerCell/AlphaSomething/1/Burning/0')])];
    const flat = flattenTreeNodes(tree, 30);
    expect(flat[0].title).toBe('BMS...1/Burning/0');
  });

  it('preserves the leaf data so displayValue stays wired', () => {
    const original = leaf('BMS/Pack/Voltage', 'V');
    const flat = flattenTreeNodes([branch('BMS', [original])]);
    expect(flat[0].data?.dataType).toBe(original.data!.dataType);
    expect(flat[0].data?.displayValue).toBe(original.data!.displayValue);
    expect(flat[0].key).toBe(original.key);
  });

  it('sorts results alphabetically by label', () => {
    const tree = [
      branch('MPU', [leaf('MPU/State/Speed')]),
      branch('BMS', [leaf('BMS/Pack/Voltage'), leaf('BMS/Pack/SoC')]),
      leaf('Aux/Sensor/Zeta')
    ];
    const flat = flattenTreeNodes(tree);
    const labels = flat.map((n) => n.title);
    expect(labels).toEqual(['Aux/Sensor/Zeta', 'BMS/Pack/SoC', 'BMS/Pack/Voltage', 'MPU/State/Speed']);
  });

  it('returns an empty list when the tree has no leaves', () => {
    const flat = flattenTreeNodes([branch('Empty', [])]);
    expect(flat).toEqual([]);
  });
});

describe('filterSelectedNodes', () => {
  const voltage = leaf('BMS/Pack/Voltage', 'V');
  const soc = leaf('BMS/Pack/SoC', '%');
  const speed = leaf('MPU/State/Speed', 'mph');
  const flat = [voltage, soc, speed];

  it('returns nodes whose dataType matches the selection by name', () => {
    const result = filterSelectedNodes(flat, [voltage.data!.dataType, speed.data!.dataType]);
    expect(result).toEqual([voltage, speed]);
  });

  it('preserves original node references so live values and tree state carry over', () => {
    const [match] = filterSelectedNodes(flat, [voltage.data!.dataType]);
    expect(match).toBe(voltage);
  });

  it('returns an empty list when no data types are selected', () => {
    expect(filterSelectedNodes(flat, [])).toEqual([]);
  });

  it('ignores selected data types that are not in the flat list', () => {
    const ghost: DataType = { name: 'Does/Not/Exist', unit: '' };
    const result = filterSelectedNodes(flat, [ghost, soc.data!.dataType]);
    expect(result).toEqual([soc]);
  });
});

describe('findSelectedAncestors', () => {
  it('returns every branch above a selected leaf', () => {
    const pack = branch('Pack', [leaf('BMS/Pack/Voltage'), leaf('BMS/Pack/SoC')]);
    const bms = branch('BMS', [pack]);
    const mpu = branch('MPU', [leaf('MPU/Speed')]);
    expect(findSelectedAncestors([bms, mpu], new Set(['BMS/Pack/SoC']))).toEqual([pack, bms]);
  });

  it('returns nothing when nothing is selected', () => {
    expect(findSelectedAncestors([branch('BMS', [leaf('BMS/SoC')])], new Set())).toEqual([]);
  });
});

describe('filterTopicTree', () => {
  const voltage = leaf('BMS/Pack/Voltage');
  const soc = leaf('BMS/Pack/SoC');
  const pack = branch('Pack', [voltage, soc]);
  const bms = branch('BMS', [pack]);
  const mpu = branch('MPU', [leaf('MPU/Speed')]);

  it('returns the tree unchanged for an empty query', () => {
    const tree = [bms, mpu];
    expect(filterTopicTree(tree, '  ').nodes).toBe(tree);
  });

  it('keeps matching leaves and their branches, case-insensitively, and expands those branches', () => {
    const { nodes, expand } = filterTopicTree([bms, mpu], 'soc');
    expect(nodes.map((n) => n.title)).toEqual(['BMS']);
    expect(nodes[0].children[0].children).toEqual([soc]);
    expect(nodes[0].children[0].children[0]).toBe(soc);
    expect(expand.map((n) => n.key)).toEqual(['Pack/', 'BMS/']);
    expect(expand).toContain(nodes[0]);
  });

  it('keeps all children of a matching branch', () => {
    const { nodes } = filterTopicTree([bms, mpu], 'pack');
    expect(nodes[0].children).toEqual([pack]);
  });
});
