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
 * input group and lucide icons, following the WAI-ARIA tree pattern: one roving Tab stop on the
 * active treeitem, arrow keys, Home/End and type-ahead. Branches expand on click; leaves toggle
 * their selection.
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
  /** The treeitem that holds the roving Tab stop. */
  active = signal<TopicTreeNode | undefined>(undefined);
  private typeahead = '';
  private typeaheadTimer?: ReturnType<typeof setTimeout>;

  private parents = computed(() => {
    const map = new Map<TopicTreeNode, TopicTreeNode>();
    const walk = (node: TopicTreeNode) =>
      node.children?.forEach((child) => {
        map.set(child, node);
        walk(child);
      });
    this.nodes().forEach(walk);
    return map;
  });

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

  /** True for the one treeitem in the Tab order: the active one, or the first root if it isn't rendered. */
  isTabStop(node: TopicTreeNode): boolean {
    const active = this.active();
    if (active && this.isRendered(active)) return node === active;
    return node === this.nodes().find((root) => this.isShown(root));
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
    // Keydown bubbles from nested treeitems; only the focused one handles it.
    if (event.target !== event.currentTarget) return;
    const item = event.currentTarget as HTMLElement;
    switch (event.key) {
      case 'Enter':
      case ' ':
        this.activate(node);
        break;
      case 'ArrowRight':
        if (!this.isBranch(node)) break;
        if (this.isExpanded(node)) item.querySelector<HTMLElement>('[role="treeitem"]')?.focus();
        else node.expanded = true;
        break;
      case 'ArrowLeft':
        if (this.isBranch(node) && this.isExpanded(node) && this.visible() === null) node.expanded = false;
        else item.parentElement?.closest<HTMLElement>('[role="treeitem"]')?.focus();
        break;
      case 'ArrowDown':
        this.focusAt(item, (i) => i + 1);
        break;
      case 'ArrowUp':
        this.focusAt(item, (i) => i - 1);
        break;
      case 'Home':
        this.focusAt(item, () => 0);
        break;
      case 'End':
        this.focusAt(item, (_, n) => n - 1);
        break;
      default:
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        this.typeAhead(item, event.key);
    }
    event.preventDefault();
  }

  private items(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('[role="treeitem"]'));
  }

  private focusAt(item: HTMLElement, next: (index: number, count: number) => number) {
    const items = this.items();
    items[next(items.indexOf(item), items.length)]?.focus();
  }

  /** Focuses the next treeitem whose label starts with the typed characters. */
  private typeAhead(item: HTMLElement, char: string) {
    clearTimeout(this.typeaheadTimer);
    this.typeahead += char.toLowerCase();
    this.typeaheadTimer = setTimeout(() => (this.typeahead = ''), 500);
    const items = this.items();
    const start = items.indexOf(item) + (this.typeahead.length === 1 ? 1 : 0);
    const ordered = [...items.slice(start), ...items.slice(0, start)];
    ordered.find((el) => (el.getAttribute('aria-label') ?? '').toLowerCase().startsWith(this.typeahead))?.focus();
  }

  /** Whether the node is in the DOM: shown by the filter, with every ancestor expanded. */
  private isRendered(node: TopicTreeNode): boolean {
    if (!this.isShown(node)) return false;
    for (let parent = this.parents().get(node); parent; parent = this.parents().get(parent)) {
      if (!this.isShown(parent) || !this.isExpanded(parent)) return false;
    }
    return true;
  }
}
