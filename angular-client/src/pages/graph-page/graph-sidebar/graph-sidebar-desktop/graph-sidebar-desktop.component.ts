import { Component, Injector, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MessageService, TreeNode, PrimeTemplate } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { TreeNodeSelectEvent, TreeNodeUnSelectEvent, Tree } from 'primeng/tree';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { take } from 'rxjs';
import {
  DropdownOption,
  SelectDropdownComponent,
  SelectorConfig
} from 'src/components/select-dropdown/select-dropdown.component';
import { GraphPresetService, Preset } from 'src/services/graph-preset.service';
import Storage from 'src/services/storage.service';
import { dataTypesToNodes, partitionDataTypesByName } from 'src/utils/dataTypes.utils';
import {
  mapNodesToTreeNodes,
  findSelectedTreeNodes,
  flattenTreeNodes,
  filterSelectedNodes,
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
  imports: [ButtonComponent, Tree, PrimeTemplate, TypographyComponent, ToggleSwitch, FormsModule, SelectDropdownComponent]
})
export default class GraphSidebarDesktopComponent implements OnInit {
  private topicSelectionService = inject(TopicSelectionService);
  private presetService = inject(GraphPresetService);
  private dialogService = inject(DialogService);
  private messageService = inject(MessageService);
  private storage = inject(Storage);
  private injector = inject(Injector);

  dataTypes = input<DataType[]>([]);
  treeNodes: TreeNode<TreeNodeData>[] = [];
  flatNodes: TreeNode<TreeNodeData>[] = [];
  selectedNodes?: TreeNode<TreeNodeData>[];
  flattenMode = signal(false);
  selectedOnly = signal(false);

  private selectedDataTypesSig = toSignal(this.topicSelectionService.getSelectedDataTypes(), { initialValue: [] });
  private selectedFlatNodes = computed(() => filterSelectedNodes(this.flatNodes, this.selectedDataTypesSig()));
  activeNodes = computed(() => {
    if (this.selectedOnly()) return this.selectedFlatNodes();
    return this.flattenMode() ? this.flatNodes : this.treeNodes;
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

  ngOnInit(): void {
    const nodes = dataTypesToNodes(this.dataTypes());
    this.treeNodes = mapNodesToTreeNodes(nodes, this.storage, this.injector);
    this.flatNodes = flattenTreeNodes(this.treeNodes);
    this.selectedNodes = findSelectedTreeNodes(this.treeNodes, this.topicSelectionService);
  }

  toggleFlattenMode(value: boolean) {
    this.flattenMode.set(value);
    if (this.selectedOnly()) return;
    const active = value ? this.flatNodes : this.treeNodes;
    this.selectedNodes = findSelectedTreeNodes(active, this.topicSelectionService);
  }

  toggleSelectedOnly(value: boolean) {
    this.selectedOnly.set(value);
    this.selectedNodes = findSelectedTreeNodes(this.activeNodes(), this.topicSelectionService);
  }

  clearSelections = () => {
    this.treeNodes.forEach((n) => (n.expanded = false));
    this.topicSelectionService.clearSelection();
    this.selectedNodes = undefined;
  };

  openPresetsDialog = () => {
    const ref = this.dialogService.open(PresetDialogComponent, {
      header: 'Topic Presets',
      width: '640px',
      draggable: true,
      closable: true,
      closeAriaLabel: 'Close',
      data: {
        dataTypes: this.dataTypes()
      }
    });
    ref.onClose.pipe(take(1)).subscribe((matched: DataType[] | null) => {
      if (matched) {
        this.applyMatched(matched);
      }
    });
  };

  nodeSelect(event: TreeNodeSelectEvent) {
    const dt = event.node.data?.dataType;
    if (dt) {
      this.topicSelectionService.addDataType(dt);
    }
  }

  onRowClick(evt: MouseEvent, node: TreeNode) {
    if (node.children?.length !== 0) {
      evt.preventDefault();
      evt.stopPropagation();
      node.expanded = !node.expanded;
    }
  }

  onNodeUnselect(event: TreeNodeUnSelectEvent) {
    const dt = event.node.data?.dataType;
    if (dt) {
      this.topicSelectionService.removeDataType(dt);
    }
  }

  private applyPreset(preset: Preset) {
    const { matched, unknown } = partitionDataTypesByName(this.dataTypes(), preset.topicNames);
    if (unknown.length > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Unknown Topics Skipped',
        detail: unknown.join(', '),
        life: 8000
      });
    }
    this.applyMatched(matched);
  }

  private applyMatched(matched: DataType[]) {
    this.topicSelectionService.setSelectedDataTypes(matched);
    this.selectedNodes = findSelectedTreeNodes(this.activeNodes(), this.topicSelectionService);
  }
}
