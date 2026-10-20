import {
  Component,
  Injector,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  ChangeDetectionStrategy,
  DestroyRef
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TuiDialogService } from '@taiga-ui/core';
import { TuiSwitch } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import {
  DropdownOption,
  SelectDropdownComponent,
  SelectorConfig
} from 'src/components/select-dropdown/select-dropdown.component';
import { GraphPresetService, Preset } from 'src/services/graph-preset.service';
import Storage from 'src/services/storage.service';
import { dataTypesToNodes } from 'src/utils/dataTypes.utils';
import {
  mapNodesToTreeNodes,
  findSelectedTreeNodes,
  flattenTreeNodes,
  filterSelectedNodes,
  TreeNode,
  TreeNodeData
} from 'src/utils/tree.utils';
import { DataType } from 'src/utils/types.utils';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { ButtonComponent } from '../../../../components/argos-button/argos-button.component';
import TypographyComponent from 'src/components/typography/typography.component';
import { PresetDialogComponent, PresetDialogData } from '../../preset-dialog/preset-dialog.component';
import { TopicTreeComponent } from 'src/components/topic-tree/topic-tree.component';

@Component({
  selector: 'graph-sidebar-desktop',
  templateUrl: './graph-sidebar-desktop.component.html',
  styleUrls: ['./graph-sidebar-desktop.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ButtonComponent, TopicTreeComponent, TypographyComponent, TuiSwitch, FormsModule, SelectDropdownComponent]
})
export default class GraphSidebarDesktopComponent {
  private destroyRef = inject(DestroyRef);
  private topicSelectionService = inject(TopicSelectionService);
  private presetService = inject(GraphPresetService);
  private dialogs = inject(TuiDialogService);
  private storage = inject(Storage);
  private injector = inject(Injector);

  dataTypes = input<DataType[]>([]);
  treeNodes = computed(() => {
    const nodes = dataTypesToNodes(this.dataTypes());
    // Leaf toSignal()s can't be created in a reactive context; they clean up via the injector.
    return untracked(() => mapNodesToTreeNodes(nodes, this.storage, this.injector));
  });
  flatNodes = computed(() => flattenTreeNodes(this.treeNodes()));
  // Re-derived when the tree is rebuilt; also set locally by the tree's two-way selection.
  selectedNodes = linkedSignal<TreeNode<TreeNodeData>[] | undefined>(() =>
    findSelectedTreeNodes(this.treeNodes(), this.topicSelectionService)
  );
  flattenMode = signal(false);
  selectedOnly = signal(false);

  private selectedDataTypesSig = toSignal(this.topicSelectionService.getSelectedDataTypes(), { initialValue: [] });
  private selectedFlatNodes = computed(() => filterSelectedNodes(this.flatNodes(), this.selectedDataTypesSig()));
  activeNodes = computed(() => {
    if (this.selectedOnly()) return this.selectedFlatNodes();
    return this.flattenMode() ? this.flatNodes() : this.treeNodes();
  });

  private presets = toSignal(this.presetService.getPresets(), { initialValue: [] as Preset[] });
  presetSelectorConfig = computed<SelectorConfig>(() => ({
    placeholder: 'Apply Preset…',
    options: this.presets().map(
      (p): DropdownOption => ({
        name: p.name,
        function: () => this.applyPreset(p)
      })
    )
  }));
  activePresetName = toSignal(this.presetService.getActivePresetName(), { initialValue: undefined });

  toggleFlattenMode(value: boolean) {
    this.flattenMode.set(value);
    if (this.selectedOnly()) return;
    const active = value ? this.flatNodes() : this.treeNodes();
    this.selectedNodes.set(findSelectedTreeNodes(active, this.topicSelectionService));
  }

  toggleSelectedOnly(value: boolean) {
    this.selectedOnly.set(value);
    this.selectedNodes.set(findSelectedTreeNodes(this.activeNodes(), this.topicSelectionService));
  }

  clearSelections = () => {
    this.treeNodes().forEach((n) => (n.expanded = false));
    this.topicSelectionService.clearSelection();
    this.selectedNodes.set(undefined);
  };

  openPresetsDialog = () => {
    this.dialogs
      .open<DataType[] | null>(new PolymorpheusComponent(PresetDialogComponent), {
        label: 'Topic Presets',
        data: { dataTypes: this.dataTypes() } satisfies PresetDialogData
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((matched) => {
        if (matched) {
          this.applyMatched(matched);
        }
      });
  };

  nodeSelect(node: TreeNode<TreeNodeData>) {
    const dt = node.data?.dataType;
    if (dt) {
      this.topicSelectionService.addDataType(dt);
      this.selectedNodes.update((selected) => [...(selected ?? []), node]);
    }
  }

  onNodeUnselect(node: TreeNode<TreeNodeData>) {
    const dt = node.data?.dataType;
    if (dt) {
      this.topicSelectionService.removeDataType(dt);
      this.selectedNodes.update((selected) => selected?.filter((n) => n.data?.dataType.name !== dt.name));
    }
  }

  private applyPreset(preset: Preset) {
    const matched = this.presetService.resolvePresetTopics(preset, this.dataTypes());
    this.applyMatched(matched);
  }

  private applyMatched(matched: DataType[]) {
    if (matched.length === 0) return; // unknown topics warn toast
    this.topicSelectionService.setSelectedDataTypes(matched);
    this.selectedNodes.set(findSelectedTreeNodes(this.activeNodes(), this.topicSelectionService));
  }
}
