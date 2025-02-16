import { prisma as localPrisma } from "../local-prisma/prisma";
import * as fs from "fs";
import * as path from "path";
import { LocalRun } from "../types/local.types";
import { DOWNLOADS_PATH, storagePaths } from "../storage-paths";
import {
  CouldNotConnectToLocalDB,
  DataDumpFailed,
} from "../errors/dump.errors";
import { appendToCsv } from "../utils/csv.utils";
import {
  createFile,
  createFolder,
  createMeaningfulFileName,
} from "../utils/filesystem.utils";
import { writeAuditLog } from "./audit.service";
import { localRunToCsvRunRow } from "../transformers/local.transformer";

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
  await createFolder(storagePaths.getDataFolderPath(dumpFolderPath));
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

async function dumpDataTypeToCsv(batchSize: number, csvPath: string) {
  let moreData = true;
  let cursor: { name: string } | undefined;
  let csvWriteStream = fs.createWriteStream(csvPath, { flags: "a" });

  while (moreData) {
    const dataTypes = await localPrisma.data_type.findMany({
      // order by is important to ensure we don't grab the same data
      // twice while batch querying.
      orderBy: {
        name: "asc",
      },
      cursor,
      skip: cursor ? 1 : 0, // skip the cursor itself if we already have one
      take: batchSize,
    });

    if (dataTypes.length === 0) {
      moreData = false;
    } else {
      // Update cursor
      cursor = {
        name: dataTypes[dataTypes.length - 1].name,
      };
      appendToCsv(csvWriteStream, dataTypes);
      console.log(`Fetched ${dataTypes.length} Data Types`);
    }
  }
}

async function dumpRunsAndDataToCsv(dumpFolder: string, dataPerBatch: number) {
  // variables used for tracking current run and data
  let moreRuns = true;
  let cursor: { runId: number } | undefined;
  let totalRunsFetched = 0;
  let totalDataFetched = 0;
  let csvWriteStream = fs.createWriteStream(
    storagePaths.getRunCsvPath(dumpFolder),
    { flags: "a" }
  );
  let startTime = new Date();

  while (moreRuns) {
    // find the first run after the cursor (the next run to proccess)
    const localRun: LocalRun | null = await localPrisma.run.findFirst({
      orderBy: {
        runId: `asc`,
      },
      cursor,
      skip: cursor ? 1 : 0, // skip the cursor which we already got last loop
    });

    // if a local run is no longer found after the cursor, we are done
    if (!localRun) {
      moreRuns = false;
    } else {
      // Update cursor, this is where we will start of next loop
      cursor = {
        runId: localRun.runId,
      };

      // convert to the csv type before inserting (allowing us to create a uuid)
      const csvRunRow = localRunToCsvRunRow(localRun);

      appendToCsv(csvWriteStream, [csvRunRow]);
      console.log(`Inserted run ${csvRunRow.runId} to run.csv`);
      totalRunsFetched += 1;

      // DUMP DATA FOR THIS RUN
      try {
        let dataDumpStart = new Date();
        totalDataFetched += await dumpDataByRun(
          localRun.runId,
          dataPerBatch,
          dumpFolder
        );
        console.log(
          `Data dump for run ${localRun.runId} took: ${
            new Date().getTime() - dataDumpStart.getTime()
          }ms`
        );
      } catch (error) {
        throw new DataDumpFailed(
          `run ${localRun.runId} failed with, ${error.message}`
        );
      }
    }
  }

  console.log(
    `Total runs fetched: ${totalRunsFetched}, time taken: ${
      new Date().getTime() - startTime.getTime()
    }ms`
  );
  console.log(
    `Total data fetched: ${totalDataFetched}, time taken: ${
      new Date().getTime() - startTime.getTime()
    }ms`
  );
}

async function dumpDataByRun(
  runId: number,
  batchSize: number,
  dumpFolderPath: string
): Promise<number> {
  let moreData = true;
  let offset = 0;
  let totalDataFetched = 0;
  let csvWriteStream = fs.createWriteStream(
    storagePaths.getDataByRunCsvPath(dumpFolderPath, runId),
    { flags: "a" }
  );

  console.log(`Fetching data for run ${runId}...`);
  while (moreData) {
    const dataChunk = await localPrisma.data.findMany({
      where: { runId },
      take: batchSize,
      skip: offset, // skip the previously seen data
      orderBy: [{ time: "asc" }, { dataTypeName: "asc" }],
    });

    if (dataChunk.length === 0) {
      moreData = false;
    } else {
      offset += dataChunk.length; // move offset by the amount of data we just read
      appendToCsv(csvWriteStream, dataChunk);
      totalDataFetched += dataChunk.length;
      console.log(`Inserted ${dataChunk.length} rows to run-${runId}-data.csv`);
    }
  }

  console.log(`Total data fetched for run ${runId}: ${totalDataFetched}`);
  return totalDataFetched;
}

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

export async function dumpLocalDb(
  dataTypesPerBatch: number,
  dataPerBatch: number
): Promise<void> {
  console.log("Checking database connection...");
  // check that we can actually connect to the database
  await checkDbConnection(); // throws if prisma cannot connect to local
  const dumpFolderPath = await initializeDumpFileStructure();

  try {
    console.log("Starting dump process...");
    console.log("Dumping each Run with its Data...");
    await dumpRunsAndDataToCsv(dumpFolderPath, dataPerBatch);
    console.log("Data Types dump...");
    // we want to dump data types
    await dumpDataTypeToCsv(
      dataTypesPerBatch,
      storagePaths.getDataTypeCsvPath(dumpFolderPath)
    );
  } catch (error) {
    // if we fail in any of the functions above... then we record the dump as a failure
    await writeAuditLog({
      status: "Failed",
      dumpFolderName: dumpFolderPath,
      timeTrigger: new Date(),
      error: error.message,
    });
    throw error;
  }

  // if we made here we should have avoided all the errors...
  // if not that's cool, it still looks like we succeeded
  await writeAuditLog({
    status: "Success",
    dumpFolderName: dumpFolderPath,
    timeTrigger: new Date(),
  });
}
