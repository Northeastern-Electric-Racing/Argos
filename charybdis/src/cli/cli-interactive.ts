import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import {
  DIALOG_BATCH_OPTIONS,
  DIALOG_CHANGE_DB_URL_OPTIONS,
  DIALOG_UPLOAD_DUMP_FOLDER_OPTIONS,
  DIALOGE_COMMAND_OPTIONS,
  MAIN_DIALOGUE_OPTIONS,
  UPLOAD_DUMP_FOLDER_OPTIONS,
} from "./cmd-options";
import {
  getDownloadDataBatch,
  getDownloadDataTypeBatch,
  getDumpFoldersForUpload,
  getUploadDataBatch,
  getUploadDataTypeBatch,
} from "./settings";
import {
  getAllDownloadFolders,
  getMostRecentDownloadFolderPath,
} from "../services/audit.service";

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
  console.log(
    `Current batch settings:\n`,
    `download data per batch: ${getDownloadDataBatch()}\n`,
    `download data_type per batch: ${getDownloadDataTypeBatch()}\n`,
    `upload data per batch: ${getUploadDataBatch()}\n`,
    `upload data_type per batch: ${getUploadDataTypeBatch()}\n`
  );
  const batchChoice = await select({
    message: chalk.bold.blue("Select batch setting to change:"),
    choices: Object.keys(DIALOG_BATCH_OPTIONS),
  });
  if (batchChoice !== "Back to Menu") {
    const newSize = await input({
      message: `Enter new size for ${batchChoice}:`,
    });
    await DIALOG_BATCH_OPTIONS[
      batchChoice as keyof typeof DIALOG_BATCH_OPTIONS
    ](Number(newSize));
  } else {
    await DIALOG_BATCH_OPTIONS[batchChoice]();
  }
}

export async function uploadDumpFolderDialogue() {
  const choice = await select({
    message: "How would you like the upload to be choosen:",
    choices: Object.keys(DIALOG_UPLOAD_DUMP_FOLDER_OPTIONS),
  });
  let functionToMatch =
    choice as keyof typeof DIALOG_UPLOAD_DUMP_FOLDER_OPTIONS;
  switch (functionToMatch) {
    case "most-recent":
    case "all-downloads":
      await DIALOG_UPLOAD_DUMP_FOLDER_OPTIONS[functionToMatch]();
      break;
    case "specific-folder":
      try {
        let possibleFolders = getDumpFoldersForUpload();
        if (!possibleFolders) {
          possibleFolders = [await getMostRecentDownloadFolderPath()];
        }
        const folder = await select({
          message: "Enter the folder name to upload:",
          choices: possibleFolders,
        });

        await DIALOG_UPLOAD_DUMP_FOLDER_OPTIONS[functionToMatch](
          folder as string
        );
      } catch (error: any) {
        // if the error is a ENOENT error, then the audit log file does not exist
        if (error.code === "ENOENT") {
          console.log("Audit log file does not exist.");
          return;
        }
        throw error;
      }
      break;

    case "Back to Menu":
      await DIALOG_UPLOAD_DUMP_FOLDER_OPTIONS[functionToMatch]();
      break;
  }
}

export async function changeDBUrlsDialgue() {
  const choice = await select({
    message: "Select DB URL to change:",
    choices: Object.keys(DIALOG_CHANGE_DB_URL_OPTIONS),
  });
  if (choice !== "Back to Menu") {
    const newUrl = await input({ message: `Enter new URL for ${choice}:` });
    await DIALOG_CHANGE_DB_URL_OPTIONS[
      choice as keyof typeof DIALOG_CHANGE_DB_URL_OPTIONS
    ](newUrl);
  } else {
    await DIALOG_CHANGE_DB_URL_OPTIONS[choice]();
  }
}
