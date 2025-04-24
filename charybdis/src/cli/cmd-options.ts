import {
  deleteAllDownloads,
  dumpLocalDb,
  transformData,
} from "../services/dump.service";
import { uploadToCloud } from "../services/upload.service";
import {
  batchPresetOptionsDialogue,
  changeDBUrlsDialgue,
  commandDialog,
  mainMenu,
  uploadDumpFolderDialogue,
} from "./cli-interactive";
import {
  getDumpFoldersForUpload,
  getTransformingDataBatch,
  getUploadDataTypeBatch,
  setCloudDbUrl,
  setDumpFoldersForUpload,
  setLocalDbUrl,
  setTransformDataBatch,
  setUploadDataTypeBatch,
} from "./settings";
import { updatePrismaClient as updateCloudPrismaClient } from "../prisma/cloud-prisma/prisma";
import { updatePrismaClient as updateLocalPrismaClient } from "../prisma/local-prisma/prisma";
import {
  getAllDownloadFolders,
  getMostRecentDownloadFolderPath,
} from "../services/audit.service";
import { getDumpFolderPath } from "../storage-paths";

/**
 * Wrap a map of function options with a function to run after each option.
 * Primarly used to add a call to main menu after each option, for dialogue options.
 *
 * @param options - map of function options
 * @param skipList - list of options to skip wrapping
 * @param functionToWrap - function to run after each option
 * @returns wrapped options
 */
export const addDialgueWrapper = (
  options: Record<string, Function>,
  skipList: string[],
  functionToWrap: Function
) => {
  const wrappedOptions: Record<string, Function> = { ...options };

  for (const key in wrappedOptions) {
    if (!skipList.includes(key)) {
      const originalFn = wrappedOptions[key];
      wrappedOptions[key] = async (...args: any[]) => {
        await originalFn(...args);
        await functionToWrap();
      };
    }
  }

  return wrappedOptions;
};

// Main menu options
export const MAIN_DIALOGUE_OPTIONS = {
  "Change Batch Presets": batchPresetOptionsDialogue,
  "Run a Command": commandDialog,
  "Change DB urls": changeDBUrlsDialgue,
  "Change Upload Dump Folder": uploadDumpFolderDialogue,
  Exit: async () => {
    console.log("Goodbye!");
    process.exit(0);
  },
};

// general command options for both interactive CLI and command line arguments based CLI
export const COMMAND_OPTIONS = {
  dump: async () => await dumpLocalDb(getTransformingDataBatch()),
  upload: async () =>
    await uploadToCloud(getDumpFoldersForUpload(), getUploadDataTypeBatch()),
  transform: async () =>
    await transformData(
      await getMostRecentDownloadFolderPath(),
      getTransformingDataBatch()
    ),
  "delete-all-downloads": async () => await deleteAllDownloads(),
};

export const COMMAND_DIALOGUE_SKIP_WRAPPER = [];

// Command options for interactive CLI
export const DIALOGE_COMMAND_OPTIONS = addDialgueWrapper(
  {
    ...COMMAND_OPTIONS,
    "Back to Menu": async () => {},
  },
  COMMAND_DIALOGUE_SKIP_WRAPPER,
  mainMenu
);

// Batch size update options for interactive CLI and command line arguments based CLI
export const BATCH_SIZE_OPTIONS = {
  "transform-data-batch-size": async (size: number) =>
    setTransformDataBatch(size),
  "upload-data-type-batch-size": async (size: number) =>
    setUploadDataTypeBatch(size),
};

// Options that should NOT call mainMenu after execution in dialogue options
export const BATCH_DIALOGUE_SKIP_WRAPPER = [];

// Batch size update options for interactive CLI
export const DIALOG_BATCH_OPTIONS = addDialgueWrapper(
  { ...BATCH_SIZE_OPTIONS, "Back to Menu": async () => {} },
  BATCH_DIALOGUE_SKIP_WRAPPER,
  mainMenu
);

export const UPLOAD_DUMP_FOLDER_OPTIONS = {
  "most-recent": async () => {
    setDumpFoldersForUpload(undefined);
  },
  "specific-folder": async (folder: string) => {
    setDumpFoldersForUpload([folder]);
  },
  "all-downloads": async () => {
    setDumpFoldersForUpload(await getAllDownloadFolders());
  },
};

export const UPLOAD_DUMP_FOLDER_DIALOGUE_SKIP_WRAPPER = [];

// Change database URL options for interactive CLI
export const DIALOG_UPLOAD_DUMP_FOLDER_OPTIONS = addDialgueWrapper(
  {
    ...UPLOAD_DUMP_FOLDER_OPTIONS,
    "Back to Menu": async () => {},
  },
  UPLOAD_DUMP_FOLDER_DIALOGUE_SKIP_WRAPPER,
  mainMenu
);
/* ------------------- Database URL Options ------------------- */

// Change database URL options
export const CHANGE_DB_URL_OPTIONS = {
  "set-local-db": (url: string) => {
    setLocalDbUrl(url);
    updateLocalPrismaClient(url);
  },
  "set-cloud-db": (url: string) => {
    setCloudDbUrl(url);
    updateCloudPrismaClient(url);
  },
};

export const DB_URL_DIALOGUE_SKIP_WRAPPER = [];

// Change database URL options for interactive CLI
export const DIALOG_CHANGE_DB_URL_OPTIONS = addDialgueWrapper(
  {
    ...CHANGE_DB_URL_OPTIONS,
    "Back to Menu": async () => {},
  },
  DB_URL_DIALOGUE_SKIP_WRAPPER,
  mainMenu
);
