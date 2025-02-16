import { Command } from "commander";
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";

import { uploadToCloud } from "./services/upload.service";
import { deleteAllDownloads, dumpLocalDb } from "./services/dump.service";
import { updatePrismaClient as updateCloudPrismaClient } from "./cloud-prisma/prisma";
import { updatePrismaClient as updateLocalPrismaClient } from "./local-prisma/prisma";

/* ---------------------------- CLI options & Variables ---------------------------- */

// Batch settings
let downloadDataBatch = 49000;
let downloadDataTypeBatch = 1000;
let uploadDataBatch = 4960;
let uploadDataTypeBatch = 4960;

// Database URLs
let cloudUrl = process.env.CLOUD_DATABASE_URL || "";
let localUrl = process.env.LOCAL_DATABASE_URL || "";

// Main menu options
const MAIN_DIALOGUE_OPTIONS = {
  "Change Batch Presets": batchPresetOptionsDialogue,
  "Run a Command": commandDialog,
  "Change DB urls": changeDBUrls,
  Exit: async () => {
    console.log("Goodbye!");
    process.exit(0);
  },
};

/**
 * Wrap a map of function options with a function to run after each option.
 * Primarly used to add a call to main menu after each option, for dialogue options.
 *
 * @param options - map of function options
 * @param skipList - list of options to skip wrapping
 * @param functionToWrap - function to run after each option
 * @returns wrapped options
 */
const addDialgueWrapper = (
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

// general command options for both interactive CLI and command line arguments based CLI
const COMMAND_OPTIONS = {
  dump: async () => await dumpLocalDb(downloadDataTypeBatch, downloadDataBatch),
  upload: async () => await uploadToCloud(uploadDataBatch, uploadDataTypeBatch),
  "delete-all-downloads": async () => await deleteAllDownloads(),
};

const COMMAND_DIALOGUE_SKIP_WRAPPER = [];

// Command options for interactive CLI
const DIALOGE_COMMAND_OPTIONS = addDialgueWrapper(
  {
    ...COMMAND_OPTIONS,
    "Back to Menu": async () => {},
  },
  COMMAND_DIALOGUE_SKIP_WRAPPER,
  mainMenu
);

// Batch size update options for interactive CLI and command line arguments based CLI
const BATCH_SIZE_OPTIONS = {
  "download-data-batch-size": async (size: number) =>
    (downloadDataBatch = size),
  "download-data-type-batch-size": async (size: number) =>
    (downloadDataTypeBatch = size),
  "upload-data-batch-size": async (size: number) => (uploadDataBatch = size),
  "upload-data-type-batch-size": async (size: number) =>
    (uploadDataTypeBatch = size),
};

// Options that should NOT call mainMenu after execution in dialogue options
const BATCH_DIALOGUE_SKIP_WRAPPER = [];

// Batch size update options for interactive CLI
const DIALOG_BATCH_OPTIONS = addDialgueWrapper(
  { ...BATCH_SIZE_OPTIONS, "Back to Menu": async () => {} },
  BATCH_DIALOGUE_SKIP_WRAPPER,
  mainMenu
);

// Change database URL options
const CHANGE_DB_URL_OPTIONS = {
  "set-local-db": (url: string) => {
    localUrl = url;
    updateLocalPrismaClient(localUrl);
  },
  "set-cloud-db": (url: string) => {
    cloudUrl = url;
    updateCloudPrismaClient(cloudUrl);
  },
};

const DB_URL_DIALOGUE_SKIP_WRAPPER = [];

// Change database URL options for interactive CLI
const DIALOG_CHANGE_DB_URL_OPTIONS = addDialgueWrapper(
  {
    ...CHANGE_DB_URL_OPTIONS,
    "Back to Menu": async () => {},
  },
  DB_URL_DIALOGUE_SKIP_WRAPPER,
  mainMenu
);

/* ---------------------------- Interactive CLI Flow ---------------------------- */

export async function startInteractiveCLI() {
  await printTitle();
  await mainMenu();
}

async function mainMenu() {
  const choice = await select({
    message: chalk.bold.magenta("Menu:"),
    choices: Object.keys(MAIN_DIALOGUE_OPTIONS),
  });
  await MAIN_DIALOGUE_OPTIONS[choice as keyof typeof MAIN_DIALOGUE_OPTIONS]();
}

async function commandDialog() {
  const commandChoice = await select({
    message: chalk.bold.blue("Select a command:"),
    choices: Object.keys(DIALOGE_COMMAND_OPTIONS),
  });
  try {
    await DIALOGE_COMMAND_OPTIONS[
      commandChoice as keyof typeof DIALOGE_COMMAND_OPTIONS
    ]();
  } catch (err) {
    printError(err.message);
  }
}

async function batchPresetOptionsDialogue() {
  console.log("Current batch sizes:", {
    downloadDataBatch,
    downloadDataTypeBatch,
    uploadDataBatch,
    uploadDataTypeBatch,
  });
  const batchChoice = await select({
    message: chalk.bold.blue("Select batch setting to change:"),
    choices: Object.keys(DIALOG_BATCH_OPTIONS),
  });
  if (batchChoice !== "Back to Menu") {
    const newSize = await input({
      message: `Enter new size for ${batchChoice}:`,
    });
    try {
      await DIALOG_BATCH_OPTIONS[
        batchChoice as keyof typeof DIALOG_BATCH_OPTIONS
      ](Number(newSize));
    } catch (err) {
      printError(err.message);
    }
  } else {
    await DIALOG_BATCH_OPTIONS[batchChoice]();
  }
}

async function changeDBUrls() {
  const choice = await select({
    message: "Select DB URL to change:",
    choices: Object.keys(DIALOG_CHANGE_DB_URL_OPTIONS),
  });
  if (choice !== "Back to Menu") {
    const newUrl = await input({ message: `Enter new URL for ${choice}:` });
    try {
      await DIALOG_CHANGE_DB_URL_OPTIONS[
        choice as keyof typeof DIALOG_CHANGE_DB_URL_OPTIONS
      ](newUrl);
    } catch (err) {
      printError(err.message);
    }
  } else {
    await DIALOG_CHANGE_DB_URL_OPTIONS[choice]();
  }
}

/* ---------------------------- Utility Functions ---------------------------- */

async function printTitle() {
  console.log(`
   ____ _                      _         _ _       ____    ___  
  / ___| |__   __ _ _ __ _   _| |__   __| (_)___  |___ \\  / _ \\ 
 | |   | '_ \\ / _\` | '__| | | | '_ \\ / _\` | / __|   __) || | | |
 | |___| | | | (_| | |  | |_| | |_) | (_| | \\__ \\  / __/ | |_| |
  \\____|_| |_|\\__,_|_|   \\__, |_.__/ \\__,_|_|___/ |_____(_)___/ 
                         |___/                                  
`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

function printError(errorMessage: string) {
  console.log(
    chalk.whiteBright.bold("\n\nError: ") +
      chalk.underline.red.bold(`${errorMessage}\n`)
  );
}

/* ---------------------------- CLI Arguments Processing ---------------------------- */

export async function main() {
  const program = new Command();

  program
    .option("-c, --command <cmd>", "Command to run")
    .option("-b, --batch <batchParams...>", "Set batch parameter")
    .option("--url-local <localUrl>", "Set local DB URL")
    .option("--url-cloud <cloudUrl>", "Set cloud DB URL");

  program.parse(process.argv);
  const options = program.opts();

  if (process.argv.length <= 2) {
    await startInteractiveCLI();
    return;
  }

  if (options.urlLocal)
    await CHANGE_DB_URL_OPTIONS["set-local-db"](options.urlLocal);

  if (options.urlCloud)
    await CHANGE_DB_URL_OPTIONS["set-cloud-db"](options.urlCloud);

  if (options.batch) {
    const batchArray = options.batch as string[];
    for (let i = 0; i < batchArray.length; i += 2) {
      const key = batchArray[i],
        size = batchArray[i + 1];
      if (BATCH_SIZE_OPTIONS[key]) await BATCH_SIZE_OPTIONS[key](Number(size));
    }
  }

  if (options.command && COMMAND_OPTIONS[options.command]) {
    await COMMAND_OPTIONS[options.command]();
    process.exit(0);
  }
}

/* ---------------------------- Auto-run CLI ---------------------------- */

main();
