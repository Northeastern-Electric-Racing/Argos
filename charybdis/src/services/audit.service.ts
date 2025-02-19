import path from "path";
import { parse } from "csv-parse";
import fs from "fs";
import {
  DOWNLOADS_PATH,
  getAuditLogCsvPath,
  storagePaths,
} from "../storage-paths";
import { FailedWriteAuditLog } from "../errors/audit.errors";
import { prependToCsv } from "../utils/csv.utils";
import { AuditLogEntry } from "../types/csv.types";
import { get } from "http";

/**
 * Writes the given audit log entry to the audit_log.csv file.
 *
 * @param entry the audit log entry to write
 *
 * @throws {FailedWriteAuditLog} if the entry could not be written to the audit log
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  await prependToCsv(storagePaths.getAuditLogCsvPath(), [entry]);
}

/**
 * Reads the audit log file and returns the path to the most recent download folder.
 *
 * @throws {FailedWriteAuditLog} if the audit log file could not be read, with the error message
 * @returns the path to the folder based on the folder name at the top of the list of the audit_log.csv file.
 */
export async function getMostRecentDownloadFolderPath(): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log("Get most recent download folder initiated...");
    const auditLogPath = getAuditLogCsvPath();
    const auditLogStream = fs.createReadStream(auditLogPath).pipe(parse());

    let lineCount = 0;

    console.log(`Reading audit log from: ${auditLogPath}`);
    auditLogStream.on("data", (row) => {
      lineCount += 1;
      if (lineCount === 2) {
        const folderPath = row[1]; // Get the second column of the second row
        console.log(`Found folder: ${folderPath}`);
        resolve(folderPath);
      }
    });

    auditLogStream.on("error", (err) => {
      reject(new FailedWriteAuditLog(err.message));
    });
  });
}

export function getAllDownloadFolders(): Promise<string[]> {
  // Get all the folders in the audit log
  return new Promise((resolve, reject) => {
    const auditLogPath = getAuditLogCsvPath();
    const auditLogStream = fs.createReadStream(auditLogPath).pipe(parse());

    let lineCount = 0;
    let folders: string[] = [];

    console.log(`Reading audit log from: ${auditLogPath}`);
    auditLogStream.on("data", (row) => {
      lineCount += 1;
      if (lineCount > 1) {
        // Skip header row
        const folderPath = row[1]; // Get the second column
        folders.push(folderPath);
      }
    });

    auditLogStream.on("end", () => {
      resolve(folders);
    });

    auditLogStream.on("error", (err) => {
      reject(new FailedWriteAuditLog(err.message));
    });
  });
}
