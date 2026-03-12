import * as path from "path";
import { createMeaningfulFileName } from "./utils/filesystem.utils";

/* structural */
export const PROJECT_ROOT = path.resolve("./");
export const DOWNLOADS_PATH = path.resolve(PROJECT_ROOT, "downloads");

/**
 * Creates a new folder with the current date (down to the millisecond) marking a dump.
 * @returns the full path to the current dump
 */
export const getDumpFolderPath = () => {
  const currentDumpName = createMeaningfulFileName("dump", new Date());
  return `${DOWNLOADS_PATH}/${currentDumpName}`;
};

/* audit log */
export const getAuditLogCsvPath = () => `${DOWNLOADS_PATH}/audit_log.csv`;

/* data type */
export const getDataTypeCsvPath = (dumpFolderPath: string) =>
  `${dumpFolderPath}/data_type.csv`;

/* run(s) */
export const getTempRunCsvPath = (dumpFolderPath: string) =>
  `${dumpFolderPath}/temp-run.csv`;
export const getRunCsvPath = (dumpFolderPath: string) =>
  `${dumpFolderPath}/run.csv`;

/* data */
export const getDataFolderPath = (dumpFolderPath: string) =>
  `${dumpFolderPath}/data`;
export const getDataCSVPath = (dumpFolderPath: string) =>
  `${storagePaths.getDataFolderPath(dumpFolderPath)}/data.csv`;
export const getTempDataCSVPath = (dumpFolderPath: string) =>
  `${storagePaths.getDataFolderPath(dumpFolderPath)}/temp-data.csv`;

export const storagePaths = {
  getDumpFolderPath,
  getAuditLogCsvPath,
  getDataTypeCsvPath,
  getRunCsvPath,
  getTempRunCsvPath,
  getDataFolderPath,
  getTempDataCSVPath,
};
