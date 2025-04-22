import { prisma as localPrisma } from "../prisma/local-prisma/prisma";
import * as fs from "fs";
import * as path from "path";
import {
  DOWNLOADS_PATH,
  getDataCSVPath,
  getRunCsvPath,
  getTempDataCSVPath,
  getTempRunCsvPath,
  storagePaths,
} from "../storage-paths";
import { CouldNotConnectToLocalDB } from "../errors/dump.errors";
import { appendToCsv } from "../utils/csv.utils";
import {
  createFile,
  createFolder,
  createMeaningfulFileName,
} from "../utils/filesystem.utils";
import { writeAuditLog } from "./audit.service";
import { execSync } from "child_process";
import * as csv from "fast-csv";
import { LocalData, LocalRun } from "../types/local.types";
import { v4 as uuidv4 } from "uuid";

/**
 * Initalizes the dump file structure, for a new dump, creating all necessary folders and non-state oriented files.
 *
 * @returns the path to the current dump folder.
 */
async function initializeDumpFileStructure(): Promise<string> {
  console.log("Acquiring dump file paths...");
  const currentDumpName = createMeaningfulFileName("dump", new Date());
  const dumpFolderPath = `${DOWNLOADS_PATH}/${currentDumpName}`;
  await createFolder(DOWNLOADS_PATH);
  await createFolder(dumpFolderPath);
  await createFile(storagePaths.getAuditLogCsvPath());
  await createFile(storagePaths.getDataTypeCsvPath(dumpFolderPath));
  await createFile(storagePaths.getRunCsvPath(dumpFolderPath));
  await createFile(storagePaths.getTempRunCsvPath(dumpFolderPath));
  await createFolder(storagePaths.getDataFolderPath(dumpFolderPath));
  await createFile(storagePaths.getTempDataCSVPath(dumpFolderPath));
  return dumpFolderPath;
}

/**
 * Checks if the local database can be connected to.
 *
 * @throws {CouldNotConnectToLocalDB} if the local database cannot be connected to
 */
async function checkDbConnection() {
  try {
    await localPrisma.$connect();
  } catch (error) {
    throw new CouldNotConnectToLocalDB();
  }
}

/**
 * Dump the data types from the local database to a CSV file.
 *
 * @param batchSize the number of data types to fetch per batch
 * @param csvPath the path to the CSV file to write the data types to.
 */
function dumpDataTypeToCsv(csvPath: string) {
  let startTime = new Date();

  execSync(
    `psql ${process.env.LOCAL_DATABASE_URL} "\\copy run TO '${csvPath}' CSV HEADER"`
  );

  console.log(
    `Completed data type dump in ${Date.now() - startTime.getTime()}ms`
  );
}

/**
 * Dumps all the runs to a file, then dumps all of the data to a separate file, then assigns a unique id to all runs
 *
 * @param dumpFolder the current dump folder (to store the run and data CSVs in)
 *
 * @throws {DataDumpFailed} if the data dump fails, with the error message included.
 * @throws {RunDumpFailed} if there is failure while fetching and writing a run to the CSV.
 */
async function dumpRunsAndDataToCsv(
  dumpFolder: string,
  dataTransformingBatchSize: number
) {
  // variables used for tracking current run and data

  let startTime = new Date();

  execSync(
    `psql ${process.env.LOCAL_DATABASE_URL} "\\copy run TO '${getTempRunCsvPath(
      dumpFolder
    )}' CSV HEADER"`
  );

  console.log(
    `Fetched All Runs, time taken: ${
      new Date().getTime() - startTime.getTime()
    }ms`
  );

  const dataTime = new Date();

  console.log("Getting Data, this may take a while...");

  dumpData(dumpFolder);

  console.log(
    `Fetched All Data, time taken: ${
      new Date().getTime() - dataTime.getTime()
    }ms`
  );

  const runIdToCloudIdMap = new Map<string, string>();

  await new Promise((resolve) => {
    const ws = fs.createWriteStream(getRunCsvPath(dumpFolder));

    let rows: LocalRun[] = [];
    fs.createReadStream(getTempRunCsvPath(dumpFolder))
      .pipe(csv.parse({ headers: true }))
      .on("data", (row) => {
        // Add a unique id for each row
        row.id = uuidv4();
        runIdToCloudIdMap.set(row.runId, row.id);
        rows.push(row);
        if (rows.length > 100) {
          csv
            .write(rows, { headers: true })
            .pipe(ws)
            .on("finish", () => {
              console.log("Finished copying 100 Runs");
              resolve(null);
            });
          rows = [];
        }
      })
      .on("end", () => {
        csv
          .write(rows, { headers: true })
          .pipe(ws)
          .on("finish", () => {
            console.log("File saved with unique IDs!");
            resolve(null);
          });
      });
  });

  await new Promise((resolve) => {
    const ws = fs.createWriteStream(getDataCSVPath(dumpFolder));

    let rows: LocalData[] = [];
    fs.createReadStream(getTempDataCSVPath(dumpFolder))
      .pipe(csv.parse({ headers: true }))
      .on("data", (row) => {
        // Add a unique id for each row
        row.runId = runIdToCloudIdMap.get(row.runId);
        rows.push(row);
        if (rows.length > dataTransformingBatchSize) {
          csv
            .write(rows, { headers: true })
            .pipe(ws)
            .on("finish", () => {
              console.log(
                `Finished transforming ${dataTransformingBatchSize} Runs`
              );
              resolve(null);
            });
          rows = [];
        }
      })
      .on("end", () => {
        csv
          .write(rows, { headers: true })
          .pipe(ws)
          .on("finish", () => {
            console.log("Runs Updated");
            resolve(null);
          });
      });
  });

  console.log(`Total time: ${new Date().getTime() - startTime.getTime()}ms`);
}

/**
 * Dump all of the data from the local database to a data file
 *
 * See the csv.types.ts file for the structure of each row in the CSV file.
 *
 * @param dumpFolderPath the path to the dump folder (used to store the CSV file)
 *
 * @returns the total number of data rows fetched for the run
 */
function dumpData(dumpFolderPath: string): void {
  let startTime = new Date();

  execSync(
    `psql ${
      process.env.LOCAL_DATABASE_URL
    } -c "\\copy data TO '${getDataCSVPath(dumpFolderPath)}' CSV HEADER"`
  );

  console.log(
    `Total Fetched all data. total time taken: ${
      new Date().getTime() - startTime.getTime()
    }ms`
  );
}

/**
 * Goes through all the files and folders in the downloads folder and deletes them.
 *
 * As this function is mainly IO there is no need to throw custom errors.
 */
export async function deleteAllDownloads(): Promise<void> {
  // Read all entries in the downloads folder
  const entries = await fs.promises.readdir(DOWNLOADS_PATH, {
    withFileTypes: true,
  });

  // Iterate over each entry and remove it
  for (const entry of entries) {
    const fullPath = path.join(DOWNLOADS_PATH, entry.name);
    if (entry.isDirectory()) {
      // Recursively remove the directory and its contents
      await fs.promises.rm(fullPath, { recursive: true, force: true });
    } else {
      // Remove the file
      await fs.promises.unlink(fullPath);
    }
  }
  console.log("All downloads have been deleted.");
}

/**
 * Dumps the local database to CSV files in the downloads folder.
 *
 * @param dataTransformingBatchSize The size of the batch that we will locally store in memory before flushing to
 * file stream when transforming data runs
 *
 * @throws {CouldNotConnectToLocalDB} if the local database cannot be connected to
 * @throws {DataTypeDumpFailed} if the data type dump fails, with the error message included.
 * @throws {DataDumpFailed} if the data dump fails, with the error message included.
 * @throws {RunDumpFailed} if there is failure while fetching and writing a run to the CSV.
 */
export async function dumpLocalDb(
  dataTransformingBatchSize: number
): Promise<void> {
  console.log("Checking database connection...");
  // check that we can actually connect to the database
  await checkDbConnection(); // throws if prisma cannot connect to local
  const dumpFolderPath = await initializeDumpFileStructure();

  try {
    console.log("Starting dump process...");
    console.log("Dumping each Run with its Data...");
    await dumpRunsAndDataToCsv(dumpFolderPath, dataTransformingBatchSize);
    console.log("Data Types dump...");
    // we want to dump data types
    await dumpDataTypeToCsv(storagePaths.getDataTypeCsvPath(dumpFolderPath));
  } catch (error) {
    // if we fail in any of the functions above... then we record the dump as a failure
    await writeAuditLog({
      status: "Failed",
      dumpFolderName: dumpFolderPath,
      timeTrigger: new Date(),
    });
    throw error;
  }

  console.log("Local database dump complete.");

  // if we made here we should have avoided all the errors...
  // if not that's cool, it still looks like we succeeded
  await writeAuditLog({
    status: "Success",
    dumpFolderName: dumpFolderPath,
    timeTrigger: new Date(),
  });
}
