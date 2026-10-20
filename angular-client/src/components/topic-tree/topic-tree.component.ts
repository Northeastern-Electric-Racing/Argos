import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
  output,
  signal
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideChevronRight, lucideSearch } from '@ng-icons/lucide';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import TypographyComponent from 'src/components/typography/typography.component';
import { TreeNode, TreeNodeData } from 'src/utils/tree.utils';

type TopicTreeNode = TreeNode<TreeNodeData>;

/**
 * Filterable, multi-select topic tree. Spartan has no tree component, so this is built on its
 * input group and lucide icons, following the WAI-ARIA tree pattern (roles, arrow-key navigation).
 * Branches expand on click; leaves toggle their selection.
 */
@Component({
  selector: 'topic-tree',
  templateUrl: './topic-tree.component.html',
  styleUrls: ['./topic-tree.component.css'],
  // Callers flip node.expanded in place (clear, preset apply), so the tree re-reads it every pass.
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [NgTemplateOutlet, NgIcon, HlmInputGroupImports, TypographyComponent],
  providers: [provideIcons({ lucideChevronDown, lucideChevronRight, lucideSearch })]
})
export class TopicTreeComponent {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  nodes = input<TopicTreeNode[]>([]);
  selection = model<TopicTreeNode[] | undefined>();
  filterPlaceholder = input('Search topics...');
  /** CSS height of the scrolling node list. */
  height = input('80vh');

  nodeSelect = output<TopicTreeNode>();
  nodeUnselect = output<TopicTreeNode>();

  filter = signal('');

  private selectedSet = computed(() => new Set(this.selection() ?? []));

  /** While filtering: matches, their ancestors and their descendants. Null when not filtering. */
  private visible = computed<Set<TopicTreeNode> | null>(() => {
    const term = this.filter().trim().toLowerCase();
    if (!term) return null;
    const keep = new Set<TopicTreeNode>();
    const addSubtree = (node: TopicTreeNode) => {
      keep.add(node);
      node.children?.forEach(addSubtree);
    };
    const walk = (node: TopicTreeNode): boolean => {
      if ((node.label ?? '').toLowerCase().includes(term)) {
        addSubtree(node);
        return true;
      }
      let childMatched = false;
      for (const child of node.children ?? []) childMatched = walk(child) || childMatched;
      if (childMatched) keep.add(node);
      return childMatched;
    };
    this.nodes().forEach(walk);
    return keep;
  });

  isBranch(node: TopicTreeNode): boolean {
    return (node.children?.length ?? 0) > 0;
  }

  isShown(node: TopicTreeNode): boolean {
    return this.visible()?.has(node) ?? true;
  }

  isExpanded(node: TopicTreeNode): boolean {
    return this.visible() !== null || !!node.expanded;
  }

  isSelected(node: TopicTreeNode): boolean {
    return this.selectedSet().has(node);
  }

  onFilterInput(event: Event) {
    this.filter.set((event.target as HTMLInputElement).value);
  }

  activate(node: TopicTreeNode) {
    if (this.isBranch(node)) {
      node.expanded = !node.expanded;
      return;
    }
    if (!node.selectable) return;
    const current = this.selection() ?? [];
    if (this.isSelected(node)) {
      this.selection.set(current.filter((n) => n !== node));
      this.nodeUnselect.emit(node);
    } else {
      this.selection.set([...current, node]);
      this.nodeSelect.emit(node);
    }
  }

  onKeydown(event: KeyboardEvent, node: TopicTreeNode) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        this.activate(node);
        break;
      case 'ArrowRight':
        if (this.isBranch(node)) node.expanded = true;
        break;
      case 'ArrowLeft':
        if (this.isBranch(node)) node.expanded = false;
        break;
      case 'ArrowDown':
        this.moveFocus(event, 1);
        break;
      case 'ArrowUp':
        this.moveFocus(event, -1);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private moveFocus(event: KeyboardEvent, step: number) {
    const rows = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('.tree-row'));
    const index = rows.indexOf(event.currentTarget as HTMLElement);
    rows[index + step]?.focus();
  }
}
