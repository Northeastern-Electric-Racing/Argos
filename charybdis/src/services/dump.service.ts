import { prisma as localPrisma } from "../local-prisma/prisma";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidV4 } from "uuid";
import { LocalRun } from "../types/local.types";
import { CsvRunRow } from "../types/csv.types";
import { DOWNLOADS_PATH, dumpPaths } from "../storage-paths";
import {
  CouldNotConnectToLocalDB,
  DataDumpFailed,
} from "../errors/dump.errors";
import { appendToCsv, prependToCsv } from "../utils/csv.utils";
import {
  createFile,
  createFolder,
  createMeaningfulFileName,
} from "../utils/filesystem.utils";
import { FailedWriteAuditLog } from "../errors/audit.errors";
import { writeAuditLog } from "./audit.service";
import { error } from "console";

async function checkDbConnection() {
  try {
    await localPrisma.$connect();
  } catch (error) {
    throw new CouldNotConnectToLocalDB();
  }
}

async function initializeDumpFileStructure(): Promise<string> {
  console.log("Acquiring dump file paths...");
  const currentDumpName = createMeaningfulFileName("dump", new Date());
  const dumpFolderPath = `${DOWNLOADS_PATH}/${currentDumpName}`;
  await createFolder(DOWNLOADS_PATH);
  await createFolder(dumpFolderPath);
  await createFile(dumpPaths.getAuditLogCsvPath());
  await createFile(dumpPaths.getDataTypeCsvPath(dumpFolderPath));
  await createFile(dumpPaths.getRunCsvPath(dumpFolderPath));
  await createFolder(dumpPaths.getDataFolderPath(dumpFolderPath));
  return dumpFolderPath;
}

export async function dumpLocalDb(
  dataTypesPerBatch: number = 1000,
  dataPerBatch: number = 49000
): Promise<void> {
  console.log("Checking database connection...");
  // check that we can actually connect to the database
  await checkDbConnection(); // throws if prisma cannot connect to local
  const dumpFolderPath = await initializeDumpFileStructure();

  try {
    console.log("Starting dump process...");
    console.log("Dumping each Run with its Data...");
    await dumpRunsAndDataToCsv(
      dumpPaths.getRunCsvPath(dumpFolderPath),
      dumpPaths.getDataFolderPath(dumpFolderPath),
      dataPerBatch
    );
    console.log("Data Types dump...");
    // we want to dump data types
    await dumpDataTypeToCsv(
      dataTypesPerBatch,
      dumpPaths.getDataTypeCsvPath(dumpFolderPath)
    );
  } catch (error) {
    // if we fail in any of the functions above... then we record the dump as a failure
    await writeAuditLog("Failed", dumpFolderPath, error.message);
    throw error;
  }

  // if we made here we should have avoided all the errors...
  // if not that's cool, it still looks like we succeeded
  await writeAuditLog("Success", dumpFolderPath);
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

async function dumpRunsAndDataToCsv(
  runsCsvPath: string,
  dumpFolder: string,
  dataPerBatch: number
) {
  // variables used for tracking current run and data
  let moreRuns = true;
  let cursor: { runId: number } | undefined;
  let totalRunsFetched = 0;
  let totalDataFetched = 0;
  let csvWriteStream = fs.createWriteStream(runsCsvPath, { flags: "a" });

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
      const csvRunRow: CsvRunRow = {
        uuid: uuidV4(),
        runId: localRun.runId.toString(),
        driverName: localRun.driverName,
        locationName: localRun.locationName,
        notes: localRun.notes,
        time: localRun.time.toISOString(),
      };

      appendToCsv(csvWriteStream, [csvRunRow]);
      console.log(`Inserted run ${csvRunRow.runId} to run.csv`);
      totalRunsFetched += 1;

      // DUMP DATA FOR THIS RUN
      try {
        totalDataFetched += await dumpDataByRun(
          localRun.runId,
          dataPerBatch,
          dumpFolder
        );
      } catch (error) {
        throw new DataDumpFailed(
          `run ${localRun.runId} failed with, ${error.message}`
        );
      }
    }
  }

  console.log(`Total runs fetched: ${totalRunsFetched}`);
  console.log(`Total data fetched: ${totalDataFetched}`);
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
    dumpPaths.getDataByRunCsvPath(dumpFolderPath, runId),
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
  try {
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
  } catch (error) {
    console.error("Error deleting downloads:", error);
    throw error;
  }
}
