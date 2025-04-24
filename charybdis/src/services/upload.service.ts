import { prisma as cloudPrisma } from "../prisma/cloud-prisma/prisma";
import { getMostRecentDownloadFolderPath } from "./audit.service";
import { CouldNotConnectToCloudDB } from "../errors/upload.errors";
import { getDataCSVPath, storagePaths } from "../storage-paths";
import { execSync } from "child_process";
import { processCsvInBatches } from "../utils/csv.utils";
import { LocalDataType } from "../types/local.types";
import { CsvDataTypeRow } from "../types/csv.types";
import { CloudDataType } from "../types/cloud.types";

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
  execSync(
    `psql ${process.env.CLOUD_DATABASE_URL} -c "\\copy run(\\"driverName\\", \\"locationName\\",\\"notes\\",\\"time\\",\\"id\\") FROM '${runsCsvPath}' CSV HEADER;"`
  );

  console.log("Processed runs");

  console.log("Begin Transaction");

  execSync(`psql ${process.env.CLOUD_DATABASE_URL} -c "BEGIN;"`);

  console.log("Drop index");

  execSync(
    `psql ${process.env.CLOUD_DATABASE_URL} -c "ALTER TABLE data DROP CONSTRAINT IF EXISTS \\"data_pkey\\";"`
  );

  console.log("Processing data, this may take a while...");
  const startTime = Date.now();

  execSync(
    `psql ${
      process.env.CLOUD_DATABASE_URL
    } -c "\\copy data(\\"values\\",\\"time\\",\\"dataTypeName\\",\\"runId\\") FROM '${getDataCSVPath(
      dumpFolderPath
    )}' CSV HEADER;"`
  );

  console.log(`Data copying took: ${Date.now() - startTime}ms`);
  const newStartTime = Date.now();
  console.log(`Removing Duplicates`);

  execSync(
    `psql ${process.env.CLOUD_DATABASE_URL} -c "CREATE INDEX IF NOT EXISTS idx_time_data_type_name ON data (\\"time\\", \\"dataTypeName\\");"`
  );

  execSync(
    `psql ${process.env.CLOUD_DATABASE_URL} -c "WITH duplicates AS (
     SELECT ctid FROM (
       SELECT ctid, ROW_NUMBER() OVER (PARTITION BY \\"time\\", \\"dataTypeName\\" ORDER BY ctid) AS rn
       FROM data
     ) sub WHERE rn > 1
   )
   DELETE FROM data WHERE ctid IN (SELECT ctid FROM duplicates);"`
  );

  console.log(`Removing Duplicates took ${Date.now() - newStartTime}ms`);
  console.log(`Recreating Constraints`);

  execSync(
    `psql ${process.env.CLOUD_DATABASE_URL} -c "DROP INDEX IF EXISTS idx_time_data_type_name;"`
  );

  execSync(
    `psql ${process.env.CLOUD_DATABASE_URL} -c "ALTER TABLE data ADD CONSTRAINT \\"data_pkey\\" PRIMARY KEY (\\"time\\",\\"dataTypeName\\");"`
  );

  console.log("Committing");

  execSync(`psql ${process.env.CLOUD_DATABASE_URL} -c "COMMIT;"`);

  console.log(`Completed Data transfer took ${Date.now() - startTime}ms`);
}
