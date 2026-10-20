import {
  Component,
  Injector,
  OnDestroy,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  ChangeDetectionStrategy
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { TopicTreeComponent } from 'src/components/topic-tree/topic-tree.component';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { take } from 'rxjs';
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
import { PresetDialogComponent } from '../../preset-dialog/preset-dialog.component';

@Component({
  selector: 'graph-sidebar-desktop',
  templateUrl: './graph-sidebar-desktop.component.html',
  styleUrls: ['./graph-sidebar-desktop.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ButtonComponent, TopicTreeComponent, TypographyComponent, HlmSwitch, FormsModule, SelectDropdownComponent]
})
export default class GraphSidebarDesktopComponent implements OnDestroy {
  private topicSelectionService = inject(TopicSelectionService);
  private presetService = inject(GraphPresetService);
  private dialogService = inject(HlmDialogService);
  private storage = inject(Storage);
  private injector = inject(Injector);
  private presetDialogRef?: BrnDialogRef<DataType[] | null>;

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
    this.presetDialogRef = this.dialogService.open<DataType[] | null>(PresetDialogComponent, {
      contentClass: 'sm:max-w-[640px]',
      context: {
        dataTypes: this.dataTypes()
      }
    });
    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- one-shot dialog result; take(1) ends it, and tying it to destroy could drop the result
    this.presetDialogRef?.closed$.pipe(take(1)).subscribe((matched) => {
      if (matched) {
        this.applyMatched(matched);
      }
    });
  };

  ngOnDestroy(): void {
    if (this.presetDialogRef) {
      this.presetDialogRef.close();
    }
  }

  nodeSelect(node: TreeNode<TreeNodeData>) {
    const dt = node.data?.dataType;
    if (dt) {
      this.topicSelectionService.addDataType(dt);
    }
  }

  onNodeUnselect(node: TreeNode<TreeNodeData>) {
    const dt = node.data?.dataType;
    if (dt) {
      this.topicSelectionService.removeDataType(dt);
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
