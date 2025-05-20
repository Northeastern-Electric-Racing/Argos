import { prisma as cloudPrisma } from "../prisma/cloud-prisma/prisma";
import { getMostRecentDownloadFolderPath } from "./audit.service";
import { CouldNotConnectToCloudDB } from "../errors/upload.errors";
import { getDataCSVPath, storagePaths } from "../storage-paths";
import { execSync } from "child_process";
import { processCsvInBatches } from "../utils/csv.utils";
import { LocalDataType, LocalRun } from "../types/local.types";
import { CsvDataTypeRow, CsvRunRow } from "../types/csv.types";
import { CloudDataType, CloudRun } from "../types/cloud.types";

const csvNames = {
  run: (path: string) => `${path}/run.csv`,
  data: (path: string) => `${path}/data/data.csv`,
  data_type: (path: string) => `${path}/data_type.csv`,
};

async function checkDbConnection() {
  try {
    await cloudPrisma.$connect();
  } catch (error) {
    throw new CouldNotConnectToCloudDB();
  }
}

export async function uploadToCloud(
  dumpFolderPaths: string[] | undefined,
  dataTypeBatchSize: number
) {
  if (!dumpFolderPaths) {
    dumpFolderPaths = [await getMostRecentDownloadFolderPath()];
  }
  let startTime = new Date();
  for (const dumpFolderPath of dumpFolderPaths) {
    // ensure we can actually connect to the database
    console.info("Checking database connection...");
    await checkDbConnection();
    console.info("Opening most recent download folder...");
    console.info("Processing data types...");
    await processDataType(dumpFolderPath, dataTypeBatchSize);
    console.info("Startin Run uploads...");
    await processRunsWithData(dumpFolderPath);

    console.log(
      `CSV to Cloud transfer complete for ${dumpFolderPath}, time taken: ${
        new Date().getTime() - startTime.getTime()
      }ms`
    );
  }

  console.log(
    `Data uploaded for folders: ${dumpFolderPaths}, time taken: ${
      new Date().getTime() - startTime.getTime()
    }ms`
  );
  await cloudPrisma.$disconnect();
}

export async function processDataType(
  dumpFolderPath: string,
  batchSize: number
) {
  console.log("Processing data types...");
  const dataTypeCsvPath = storagePaths.getDataTypeCsvPath(dumpFolderPath);
  console.log(`Processing data types from: ${dataTypeCsvPath}`);
  await processCsvInBatches<LocalDataType>(
    dataTypeCsvPath,
    async (batch: CsvDataTypeRow[]) => {
      const cloudDataTypes: CloudDataType[] = batch.map((localDataType) => ({
        name: localDataType.name,
        unit: localDataType.unit,
      }));

      await cloudPrisma.data_type.createMany({
        data: cloudDataTypes,
        skipDuplicates: true,
      });
      console.log(`Inserted ${cloudDataTypes.length} data_type entries`);
    },
    batchSize
  );
  console.log("Completed processing data types.");
}

export async function processRunsWithData(dumpFolderPath: string) {
  const runsCsvPath = csvNames.run(dumpFolderPath);

  console.log("Processing Runs...");

  await processCsvInBatches<CsvRunRow>(
    runsCsvPath,
    async (batch: CsvRunRow[]) => {
      const cloudRuns: CloudRun[] = batch.map((localRun) => ({
        id: localRun.id,
        runId: parseInt(localRun.runId),
        locationName: localRun.locationName,
        notes: localRun.notes,
        driverName: localRun.driverName,
        time: localRun.time,
      }));

      cloudRuns.forEach((run) =>
        execSync(
          `psql ${process.env.CLOUD_DATABASE_URL} -c "INSERT INTO run(\\"runId\\", \\"driverName\\", \\"locationName\\",\\"notes\\",\\"time\\",\\"id\\") VALUES ('${run.runId}', '${run.driverName}', '${run.locationName}', '${run.notes}', '${run.time}', '${run.id}') ON CONFLICT (time) DO UPDATE SET id = EXCLUDED.id"`
        )
      );
      console.log(`Inserted ${cloudRuns.length} run entries`);
    },
    100
  );

  console.log("Processed runs");

  console.log("Begin Transaction");

  console.log("Processing data, this may take a while...");
  const startTime = Date.now();

  console.log("Creating Temporary Table");

  execSync(
    `psql ${process.env.CLOUD_DATABASE_URL} -c "DROP TABLE IF EXISTS data_temp;"`
  );

  execSync(
    `psql ${process.env.CLOUD_DATABASE_URL} -c "CREATE TABLE IF NOT EXISTS data_temp (LIKE data INCLUDING ALL); ALTER TABLE data_temp DROP CONSTRAINT IF EXISTS data_temp_pkey;"`
  );

  console.log("Copying to temp table");

  execSync(
    `psql ${
      process.env.CLOUD_DATABASE_URL
    } -c "\\copy data_temp(\\"values\\",\\"time\\",\\"dataTypeName\\",\\"runId\\") FROM '${getDataCSVPath(
      dumpFolderPath
    )}' CSV HEADER;"`
  );

  console.log(`Data copying took: ${Date.now() - startTime}ms`);
  console.log("Copied to temp table. Upserting to data table");

  execSync(
    `psql ${process.env.CLOUD_DATABASE_URL} -c "INSERT INTO data (\\"values\\",\\"time\\",\\"dataTypeName\\",\\"runId\\")
      SELECT \\"values\\",\\"time\\",\\"dataTypeName\\",\\"runId\\"
      FROM data_temp
      ON CONFLICT (time, \\"dataTypeName\\") DO NOTHING;"`
  );

  console.log("Dropping temp table");

  execSync(`psql ${process.env.CLOUD_DATABASE_URL} -c "DROP TABLE data_temp"`);

  console.log(`Completed Data transfer took ${Date.now() - startTime}ms`);
}
