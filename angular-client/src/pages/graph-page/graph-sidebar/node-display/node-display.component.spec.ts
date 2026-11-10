import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { Node, NodeWithVisibilityToggle } from 'src/utils/types.utils';
import NodeDisplayComponent from './node-display.component';

const makeNode = (name: string, children: NodeWithVisibilityToggle[] = []): NodeWithVisibilityToggle => ({
  name,
  nodes: new BehaviorSubject<Node[]>(children),
  dataType: { name, unit: '' },
  topicName: `${name}/`,
  subnodesVisible: false
});

// Sub-nodes open and close instantly, like develop, whose expand animation never ran (the motion is #967).
describe('NodeDisplayComponent', () => {
  let fixture: ComponentFixture<NodeDisplayComponent>;
  let node: NodeWithVisibilityToggle;

  const subnodeNames = (): string[] =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('node-display sidebar-card > div[id]')).map(
      (card) => card.id
    );

  const toggle = () => {
    fixture.nativeElement.querySelector('sidebar-card > div').click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodeDisplayComponent]
    }).compileComponents();

    node = makeNode('BMS', [makeNode('Pack'), makeNode('Cells')]);
    fixture = TestBed.createComponent(NodeDisplayComponent);
    fixture.componentRef.setInput('node', node);
    fixture.detectChanges();
  });

  it('expands to show the tree nodes when the card is clicked', () => {
    expect(subnodeNames()).toEqual([]);

    toggle();

    expect(node.subnodesVisible).toBe(true);
    expect(subnodeNames()).toEqual(['Pack', 'Cells']);
  });

  it('collapses and removes the tree nodes on a second click', () => {
    toggle();
    toggle();

    expect(node.subnodesVisible).toBe(false);
    expect(subnodeNames()).toEqual([]);
  });
});
