import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
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

// The expand/collapse animation is CSS run by animate.enter/animate.leave, which Angular skips under
// jsdom (no Element.getAnimations), so these specs cover the toggle the animation decorates.
describe('NodeDisplayComponent', () => {
  let fixture: ComponentFixture<NodeDisplayComponent>;
  let node: NodeWithVisibilityToggle;

  const subnodeNames = (): string[] =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('node-display sidebar-card .card')).map(
      (card) => card.id
    );

  const toggle = () => {
    fixture.nativeElement.querySelector('sidebar-card').click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodeDisplayComponent, MatIconTestingModule]
    }).compileComponents();

    node = makeNode('BMS', [makeNode('Pack'), makeNode('Cells')]);
    fixture = TestBed.createComponent(NodeDisplayComponent);
    fixture.componentRef.setInput('node', node);
    fixture.detectChanges();
  });

  it('expands to show the sub-nodes when the card is clicked', () => {
    expect(subnodeNames()).toEqual([]);

    toggle();

    expect(node.subnodesVisible).toBe(true);
    expect(subnodeNames()).toEqual(['Pack', 'Cells']);
  });

  it('collapses and removes the sub-nodes on a second click', () => {
    toggle();
    toggle();

    expect(node.subnodesVisible).toBe(false);
    expect(subnodeNames()).toEqual([]);
  });
});
