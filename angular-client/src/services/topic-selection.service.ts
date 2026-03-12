import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DataType } from 'src/utils/types.utils';

/**
 * Service for managing selected topics/data types across the application.
 * This service acts as a central state manager for topic selection,
 * allowing any component to add, remove, or observe selected topics.
 */
@Injectable({
  providedIn: 'root'
})
export class TopicSelectionService {
  // Private BehaviorSubject to hold the selected data types
  private selectedDataTypes = new BehaviorSubject<DataType[]>([]);

  /**
   * Get an observable of the currently selected data types.
   * Components can subscribe to this to react to selection changes.
   * @returns BehaviorSubject that emits the current array of selected data types
   */
  getSelectedDataTypes = () => {
    return this.selectedDataTypes;
  };

  /**
   * Set the selected data types, replacing the current selection entirely.
   * @param dataTypes Array of data types to set as selected
   */
  setSelectedDataTypes = (dataTypes: DataType[]) => {
    this.selectedDataTypes.next([...dataTypes]);
  };

  /**
   * Add a single data type to the current selection.
   * If the data type is already selected, this is a no-op.
   * @param dataType The data type to add to the selection
   */
  addDataType = (dataType: DataType) => {
    const currentSelection = this.selectedDataTypes.value;
    // Check if already selected to avoid duplicates
    if (!currentSelection.some((dt) => dt.name === dataType.name)) {
      this.selectedDataTypes.next([...currentSelection, dataType]);
    }
  };

  /**
   * Add multiple data types to the current selection.
   * Only adds data types that are not already selected.
   * @param dataTypes Array of data types to add to the selection
   */
  addDataTypes = (dataTypes: DataType[]) => {
    const currentSelection = this.selectedDataTypes.value;
    const newDataTypes = dataTypes.filter((dt) => !currentSelection.some((existing) => existing.name === dt.name));
    if (newDataTypes.length > 0) {
      this.selectedDataTypes.next([...currentSelection, ...newDataTypes]);
    }
  };

  /**
   * Remove a single data type from the current selection.
   * If the data type is not selected, this is a no-op.
   * @param dataType The data type to remove from the selection
   */
  removeDataType = (dataType: DataType) => {
    const currentSelection = this.selectedDataTypes.value;
    const filtered = currentSelection.filter((dt) => dt.name !== dataType.name);
    this.selectedDataTypes.next(filtered);
  };

  /**
   * Remove multiple data types from the current selection.
   * @param dataTypes Array of data types to remove from the selection
   */
  removeDataTypes = (dataTypes: DataType[]) => {
    const currentSelection = this.selectedDataTypes.value;
    const namesToRemove = new Set(dataTypes.map((dt) => dt.name));
    const filtered = currentSelection.filter((dt) => !namesToRemove.has(dt.name));
    this.selectedDataTypes.next(filtered);
  };

  /**
   * Toggle a data type's selection state.
   * If selected, it will be removed. If not selected, it will be added.
   * @param dataType The data type to toggle
   */
  toggleDataType = (dataType: DataType) => {
    const currentSelection = this.selectedDataTypes.value;
    const isSelected = currentSelection.some((dt) => dt.name === dataType.name);

    if (isSelected) {
      this.removeDataType(dataType);
    } else {
      this.addDataType(dataType);
    }
  };

  /**
   * Clear all selected data types.
   */
  clearSelection = () => {
    this.selectedDataTypes.next([]);
  };

  /**
   * Check if a specific data type is currently selected.
   * @param dataType The data type to check
   * @returns true if the data type is selected, false otherwise
   */
  isSelected = (dataType: DataType): boolean => {
    return this.selectedDataTypes.value.some((dt) => dt.name === dataType.name);
  };

  /**
   * Get the current count of selected data types.
   * @returns The number of currently selected data types
   */
  getSelectionCount = (): number => {
    return this.selectedDataTypes.value.length;
  };
}
