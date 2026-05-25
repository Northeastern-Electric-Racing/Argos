import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TreeNode, PrimeTemplate } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TreeNodeSelectEvent, TreeNodeUnSelectEvent, Tree } from 'primeng/tree';
import { Sidebar } from 'primeng/sidebar';
import { ToggleSwitch } from 'primeng/toggleswitch';
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
  TreeNodeData
} from 'src/utils/tree.utils';
import { DataType } from 'src/utils/types.utils';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { ButtonComponent } from '../../../../components/argos-button/argos-button.component';
import TypographyComponent from 'src/components/typography/typography.component';
import { PresetDialogComponent } from '../../preset-dialog/preset-dialog.component';

@Component({
  selector: 'graph-sidebar-mobile',
  templateUrl: './graph-sidebar-mobile.component.html',
  styleUrls: ['./graph-sidebar-mobile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Sidebar,
    PrimeTemplate,
    Tree,
    ButtonComponent,
    TypographyComponent,
    ToggleSwitch,
    FormsModule,
    SelectDropdownComponent
  ]
})
export default class GraphSidebarMobileComponent implements OnInit, OnDestroy {
  dataTypes = input.required<DataType[]>();

  private topicSelectionService = inject(TopicSelectionService);
  private presetService = inject(GraphPresetService);
  private dialogService = inject(DialogService);
  private storage = inject(Storage);
  private injector = inject(Injector);
  private presetDialogRef?: DynamicDialogRef;

  sidebarVisible = false;
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

  toggleSidebar = () => {
    this.sidebarVisible = !this.sidebarVisible;
  };

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
    this.presetDialogRef = this.dialogService.open(PresetDialogComponent, {
      header: 'Topic Presets',
      width: '90vw',
      draggable: true,
      closable: true,
      closeAriaLabel: 'Close',
      data: {
        dataTypes: this.dataTypes()
      }
    });
    this.presetDialogRef.onClose.pipe(take(1)).subscribe((matched: DataType[] | null) => {
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
    const matched = this.presetService.resolvePresetTopics(preset, this.dataTypes());
    this.applyMatched(matched);
  }

  private applyMatched(matched: DataType[]) {
    if (matched.length === 0) return; // unknown topics warn toast
    this.topicSelectionService.setSelectedDataTypes(matched);
    this.selectedNodes = findSelectedTreeNodes(this.activeNodes(), this.topicSelectionService);
  }
}
