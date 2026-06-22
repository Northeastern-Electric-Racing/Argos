import { signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TreeNode } from 'primeng/api';
import { compactTopicLabel, filterSelectedNodes, flattenTreeNodes, TreeNodeData } from './tree.utils';
import { DataType, Node } from './types.utils';

const EMPTY_DISPLAY = signal('');

const leaf = (name: string, unit = ''): TreeNode<TreeNodeData> => {
  const dataType: DataType = { name, unit };
  return {
    label: name.split('/').pop(),
    key: name + '/',
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

const branch = (name: string, children: TreeNode<TreeNodeData>[]): TreeNode<TreeNodeData> => ({
  label: name,
  key: name + '/',
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
    expect(flat[0].label).toBe('BMS/Pack/Voltage');
  });

  it('compacts long paths using firstSegment...tail', () => {
    const tree = [branch('BMS', [leaf('BMS/PerCell/AlphaSomething/1/Burning/0')])];
    const flat = flattenTreeNodes(tree, 30);
    expect(flat[0].label).toBe('BMS...1/Burning/0');
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
    const labels = flat.map((n) => n.label);
    expect(labels).toEqual(['Aux/Sensor/Zeta', 'BMS/Pack/SOC', 'BMS/Pack/Voltage', 'MPU/State/Speed']);
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

  it('preserves original node references so PrimeNG selection-by-ref works', () => {
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
