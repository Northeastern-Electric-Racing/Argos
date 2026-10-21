import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnDestroy,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  untracked
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSidenav, MatSidenavContainer } from '@angular/material/sidenav';
import { MatSlideToggle } from '@angular/material/slide-toggle';
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
import { PresetDialogComponent, PresetDialogData } from '../../preset-dialog/preset-dialog.component';
import { TopicTreeComponent } from '../topic-tree/topic-tree.component';

@Component({
  selector: 'graph-sidebar-mobile',
  templateUrl: './graph-sidebar-mobile.component.html',
  styleUrls: ['./graph-sidebar-mobile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatSidenavContainer,
    MatSidenav,
    TopicTreeComponent,
    ButtonComponent,
    TypographyComponent,
    MatSlideToggle,
    FormsModule,
    SelectDropdownComponent
  ]
})
export default class GraphSidebarMobileComponent implements OnDestroy {
  dataTypes = input.required<DataType[]>();

  private topicSelectionService = inject(TopicSelectionService);
  private presetService = inject(GraphPresetService);
  private dialog = inject(MatDialog);
  private storage = inject(Storage);
  private injector = inject(Injector);
  private presetDialogRef?: MatDialogRef<PresetDialogComponent, DataType[] | null>;

  sidebarVisible = false;
  treeNodes = computed(() => {
    const nodes = dataTypesToNodes(this.dataTypes());
    // Leaf toSignal()s can't be created in a reactive context; they clean up via the injector.
    return untracked(() => {
      const tree = mapNodesToTreeNodes(nodes, this.storage, this.injector);
      findSelectedTreeNodes(tree, this.topicSelectionService); // open the branches of topics already selected
      return tree;
    });
  });
  flatNodes = computed(() => flattenTreeNodes(this.treeNodes()));
  // Re-derived when the tree is rebuilt; also reset when a preset, a toggle or Clear changes what's shown.
  selectedNodes = linkedSignal<TreeNode<TreeNodeData>[] | undefined>(() =>
    findSelectedTreeNodes(this.treeNodes(), this.topicSelectionService)
  );
  flattenMode = signal(false);
  selectedOnly = signal(false);

  private selectedDataTypesSig = toSignal(this.topicSelectionService.getSelectedDataTypes(), { initialValue: [] });
  /** Selected topic names, for the tree's highlight. */
  selectedNames = computed(() => new Set(this.selectedDataTypesSig().map((dt) => dt.name)));
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

  toggleSidebar = () => {
    this.sidebarVisible = !this.sidebarVisible;
  };

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
    this.presetDialogRef = this.dialog.open<PresetDialogComponent, PresetDialogData, DataType[] | null>(
      PresetDialogComponent,
      {
        width: '90vw',
        maxWidth: '95vw',
        data: { dataTypes: this.dataTypes() }
      }
    );
    this.presetDialogRef
      .afterClosed()
      .pipe(take(1))
      // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- one-shot dialog result; take(1) ends it, and tying it to destroy could drop the result
      .subscribe((matched: DataType[] | null | undefined) => {
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
