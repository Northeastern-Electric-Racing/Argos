import { TestBed } from '@angular/core/testing';
import { TopicSelectionService } from './topic-selection.service';
import { DataType } from 'src/utils/types.utils';

describe('TopicSelectionService', () => {
  let service: TopicSelectionService;

  // Sample data types for testing
  const mockDataType1: DataType = { name: 'BMS/Pack/SOC', unit: '%' };
  const mockDataType2: DataType = { name: 'MPU/State/Speed', unit: 'mph' };
  const mockDataType3: DataType = { name: 'BMS/Pack/Voltage', unit: 'V' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TopicSelectionService]
    });
    service = TestBed.inject(TopicSelectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with an empty selection', (done) => {
    service.getSelectedDataTypes().subscribe((dataTypes) => {
      expect(dataTypes).toEqual([]);
      done();
    });
  });

  it('should set selected data types', (done) => {
    service.setSelectedDataTypes([mockDataType1, mockDataType2]);

    service.getSelectedDataTypes().subscribe((dataTypes) => {
      expect(dataTypes.length).toBe(2);
      expect(dataTypes).toContain(mockDataType1);
      expect(dataTypes).toContain(mockDataType2);
      done();
    });
  });

  it('should add a single data type', (done) => {
    service.setSelectedDataTypes([mockDataType1]);
    service.addDataType(mockDataType2);

    service.getSelectedDataTypes().subscribe((dataTypes) => {
      expect(dataTypes.length).toBe(2);
      expect(dataTypes).toContain(mockDataType1);
      expect(dataTypes).toContain(mockDataType2);
      done();
    });
  });

  it('should not add duplicate data types', (done) => {
    service.setSelectedDataTypes([mockDataType1]);
    service.addDataType(mockDataType1); // Try to add the same one again

    service.getSelectedDataTypes().subscribe((dataTypes) => {
      expect(dataTypes.length).toBe(1);
      done();
    });
  });

  it('should add multiple data types', (done) => {
    service.addDataTypes([mockDataType1, mockDataType2, mockDataType3]);

    service.getSelectedDataTypes().subscribe((dataTypes) => {
      expect(dataTypes.length).toBe(3);
      done();
    });
  });

  it('should remove a single data type', (done) => {
    service.setSelectedDataTypes([mockDataType1, mockDataType2]);
    service.removeDataType(mockDataType1);

    service.getSelectedDataTypes().subscribe((dataTypes) => {
      expect(dataTypes.length).toBe(1);
      expect(dataTypes).toContain(mockDataType2);
      expect(dataTypes).not.toContain(mockDataType1);
      done();
    });
  });

  it('should remove multiple data types', (done) => {
    service.setSelectedDataTypes([mockDataType1, mockDataType2, mockDataType3]);
    service.removeDataTypes([mockDataType1, mockDataType3]);

    service.getSelectedDataTypes().subscribe((dataTypes) => {
      expect(dataTypes.length).toBe(1);
      expect(dataTypes).toContain(mockDataType2);
      done();
    });
  });

  it('should toggle data type selection', () => {
    // Start with mockDataType1 selected
    service.setSelectedDataTypes([mockDataType1]);
    expect(service.isSelected(mockDataType1)).toBe(true);

    // Toggle it off
    service.toggleDataType(mockDataType1);
    expect(service.isSelected(mockDataType1)).toBe(false);

    // Toggle it back on
    service.toggleDataType(mockDataType1);
    expect(service.isSelected(mockDataType1)).toBe(true);
  });

  it('should clear all selections', (done) => {
    service.setSelectedDataTypes([mockDataType1, mockDataType2, mockDataType3]);
    service.clearSelection();

    service.getSelectedDataTypes().subscribe((dataTypes) => {
      expect(dataTypes.length).toBe(0);
      done();
    });
  });

  it('should correctly report if a data type is selected', () => {
    service.setSelectedDataTypes([mockDataType1]);

    expect(service.isSelected(mockDataType1)).toBe(true);
    expect(service.isSelected(mockDataType2)).toBe(false);
  });

  it('should return correct selection count', () => {
    expect(service.getSelectionCount()).toBe(0);

    service.setSelectedDataTypes([mockDataType1]);
    expect(service.getSelectionCount()).toBe(1);

    service.addDataType(mockDataType2);
    expect(service.getSelectionCount()).toBe(2);

    service.clearSelection();
    expect(service.getSelectionCount()).toBe(0);
  });

  it('should not add already selected data types when using addDataTypes', (done) => {
    service.setSelectedDataTypes([mockDataType1]);
    service.addDataTypes([mockDataType1, mockDataType2]); // mockDataType1 is already selected

    service.getSelectedDataTypes().subscribe((dataTypes) => {
      expect(dataTypes.length).toBe(2);
      done();
    });
  });
});
