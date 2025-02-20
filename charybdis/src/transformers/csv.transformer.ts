import { CloudData, CloudRun } from "../types/cloud.types";
import { CsvDataRow, CsvRunRow } from "../types/csv.types";

export const csvToCloudData = (
  csvDataRow: CsvDataRow,
  uuid: string
): CloudData => {
  const time = BigInt(csvDataRow.time);

  const values: number[] = JSON.parse(csvDataRow.values);

  return {
    runId: uuid,
    dataTypeName: csvDataRow.dataTypeName,
    time,
    values,
  };
};

export const csvToCloudRun = (csvRunRow: CsvRunRow): CloudRun => {
  return {
    id: csvRunRow.uuid,
    runId: Number(csvRunRow.runId),
    driverName: csvRunRow.driverName,
    notes: csvRunRow.notes,
    time: new Date(csvRunRow.time),
  };
};
