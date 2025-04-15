import { prisma as cloudPrisma } from "../prisma/cloud-prisma/prisma";
import { LocalDataType } from "../types/local.types";
import { CloudData, CloudDataType, CloudRun } from "../types/cloud.types";
import { CsvDataRow, CsvDataTypeRow, CsvRunRow } from "../types/csv.types";
import { readCsvFile } from "../utils/csv.utils";
import { csvToCloudData } from "../transformers/csv.transformer";
import { getMostRecentDownloadFolderPath } from "./audit.service";
import { processCsvInBatches } from "../utils/csv.utils";
import { CouldNotConnectToCloudDB } from "../errors/upload.errors";
import { storagePaths } from "../storage-paths";

const csvNames = {
  run: (path: string) => `${path}/run.csv`,
  data: (path: string, runId: number) => `${path}/data/run-${runId}-data.csv`,
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
  dataBatchSize: number,
  dataTypeBatchSize: number,
  dumpFolderPaths: string[] | undefined
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
    await processRunsWithData(dumpFolderPath, dataBatchSize);

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
}

export async function processRunsWithData(
  dumpFolderPath: string,
  dataBatchSize: number
) {
  const runsCsvPath = csvNames.run(dumpFolderPath);
  const runs: CsvRunRow[] = await readCsvFile<CsvRunRow>(runsCsvPath);

  for (const run of runs) {
    let cloudRun: CloudRun = {
      id: run.uuid,
      runId: Number(run.runId),
      driverName: run.driverName,
      notes: run.notes,
      time: new Date(run.time),
    };

    await cloudPrisma.run.upsert({
      where: {
        unique_run_time: {
          runId: cloudRun.runId,
          time: cloudRun.time,
        },
      },
      create: cloudRun,
      update: cloudRun,
    });

    await processCsvDataFile(
      cloudRun.id,
      cloudRun.runId,
      dumpFolderPath,
      dataBatchSize
    );
  }
}

export async function processCsvDataFile(
  uuid: string,
  runId: number,
  dumpFolderPath: string,
  batchSize: number
): Promise<number> {
  let dataForRun = 0;
  let csvDataPath = csvNames.data(dumpFolderPath, runId);
  let startTime = new Date();
  await processCsvInBatches<CsvDataRow>(
    csvDataPath,
    async (batch) => {
      let startTime = new Date();
      const cloudData: CloudData[] = batch.map((localData: CsvDataRow) =>
        csvToCloudData(localData, uuid)
      );

      let numOfData = cloudData.length;
      await cloudPrisma.data.createMany({
        data: cloudData.map((data) => {
          // JS Dates only work with maximum precision of miliseconds, 
          // however psql / prisma doesnt care about that as long as its in iso form, 
          // so manually add the microseconds into the date string
          const miliseconds = Number(data.time / 1000n);
          const date = new Date(miliseconds);
          const formattedISODate = `${date.toISOString().split("Z")[0]}${Number(
            data.time % 1000n
          )}Z`;
          return { ...data, time: formattedISODate };
        }),
        skipDuplicates: true,
      });

      dataForRun += numOfData;

      console.log(
        `Inserted ${numOfData} data entries, time taken: ${
          new Date().getTime() - startTime.getTime()
        }ms`
      );
    },
    batchSize
  );

  console.log(
    `Total data uploaded for RUN ${runId}: ${dataForRun}, time taken: ${
      new Date().getTime() - startTime.getTime()
    }ms`
  );
  return dataForRun;
}
