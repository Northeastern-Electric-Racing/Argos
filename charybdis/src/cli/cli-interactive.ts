import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import {
  DIALOG_BATCH_OPTIONS,
  DIALOG_CHANGE_DB_URL_OPTIONS,
  DIALOGE_COMMAND_OPTIONS,
  MAIN_DIALOGUE_OPTIONS,
} from "./cmd-options";
import {
  getDownloadDataBatch,
  getDownloadDataTypeBatch,
  getUploadDataBatch,
  getUploadDataTypeBatch,
} from "./settings";

/* ---------------------------- CLI Functions ---------------------------- */

export async function startInteractiveCLI() {
  await printTitle();
  await mainMenu();
}

export async function printTitle() {
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

export function printError(errorMessage: string) {
  console.log(
    chalk.whiteBright.bold("\n\nError: ") +
      chalk.underline.red.bold(`${errorMessage}\n`)
  );
}

export async function mainMenu() {
  const choice = await select({
    message: chalk.bold.magenta("Menu:"),
    choices: Object.keys(MAIN_DIALOGUE_OPTIONS),
  });
  await MAIN_DIALOGUE_OPTIONS[choice as keyof typeof MAIN_DIALOGUE_OPTIONS]();
}

export async function commandDialog() {
  const commandChoice = await select({
    message: chalk.bold.blue("Select a command:"),
    choices: Object.keys(DIALOGE_COMMAND_OPTIONS),
  });
  await DIALOGE_COMMAND_OPTIONS[
    commandChoice as keyof typeof DIALOGE_COMMAND_OPTIONS
  ]();
}

export async function batchPresetOptionsDialogue() {
  console.log("Current batch sizes:", {
    "download data per batch ": getDownloadDataBatch(),
    "download data_type per batch ": getDownloadDataTypeBatch(),
    "upload data per batch ": getUploadDataBatch(),
    "upload data_type per batch ": getUploadDataTypeBatch(),
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
      printError(err);
    }
  } else {
    await DIALOG_BATCH_OPTIONS[batchChoice]();
  }
}

export async function changeDBUrls() {
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
      printError(err);
    }
  } else {
    await DIALOG_CHANGE_DB_URL_OPTIONS[choice]();
  }
}
