import { uploadToCloud } from "./services/upload.service";
import { input, select } from "@inquirer/prompts";
import { deleteAllDownloads, dumpLocalDb } from "./services/dump.service";
import chalk from "chalk";
import { addAbortListener } from "events";

let dataPerBatch = 49000;
let dataTypePerBatch = 1000;

const main = async () => {
  await printTitle("Charybdis 2.0");
  await batchPresetOptionsDialogue();
  await commandDialog();
};

const printTitle = async (projectName: string) => {
  // Print the project title in ASCII art using figlet.
  console.log(`
   ____ _                      _         _ _       ____    ___  
  / ___| |__   __ _ _ __ _   _| |__   __| (_)___  |___ \\  / _ \\ 
 | |   | '_ \\ / _\` | '__| | | | '_ \\ / _\` | / __|   __) || | | |
 | |___| | | | (_| | |  | |_| | |_) | (_| | \\__ \\  / __/ | |_| |
  \\____|_| |_|\\__,_|_|   \\__, |_.__/ \\__,_|_|___/ |_____(_)___/ 
                         |___/                                  
`);

  // Wait a second so that the project title is fully printed
  // before the user can enter anything else.
  await new Promise((resolve) => setTimeout(resolve, 1000));
};

const commands = {
  dump: () => dumpLocalDb(dataTypePerBatch, dataPerBatch),
  upload: () => uploadToCloud(),
  "delete-all-downloads": () => deleteAllDownloads(),
};

const commandDialog = async (): Promise<void> => {
  // Using chalk to style the select prompt message.
  const command = await select({
    message: chalk.bold.blue("What would you like to do with the data:"),
    choices: Object.keys(commands), // all the keys will show up as options for the user
  });

  const userRequestedCmd = commands[command as keyof typeof commands];
  if (!userRequestedCmd) {
    printError(`Command "${command}" not found`);
  }

  try {
    console.log("Batch size: ", dataPerBatch);
    await userRequestedCmd();
  } catch (error: any) {
    printError(error.message);
  }

  await commandDialog();
};

const printError = (errorMessage: string) => {
  console.log(
    chalk.whiteBright.bold("\n\nError: ") +
      chalk.underline.red.bold(`${errorMessage}\n`)
  );
};

const dataTypeBatchSizeInput = async (): Promise<void> => {
  const newDataBatchSize = await input({
    message: chalk.bold.blue(
      `Set dataType batch size (current size:  ${dataTypePerBatch.toLocaleString()}): `
    ),
    validate: (value) => {
      const num = Number(value);
      return !isNaN(num) ? true : "Please enter a valid number";
    },
  });

  dataTypePerBatch = Number(newDataBatchSize);
  console.log("Data batch size set to: ", dataTypePerBatch.toLocaleString());
};

const dataBatchSizeInput = async (): Promise<void> => {
  const newDataBatchSize = await input({
    message: chalk.bold.blue(
      `Set data batch size (current size:  ${dataPerBatch.toLocaleString()}): `
    ),
    validate: (value) => {
      const num = Number(value);
      return !isNaN(num) ? true : "Please enter a valid number";
    },
  });

  dataPerBatch = Number(newDataBatchSize);
  console.log("Data batch size set to: ", dataPerBatch.toLocaleString());
};

const batchPresetOptions = {
  "Data Batch Size": dataBatchSizeInput,
  "Data Type Batch Size": dataTypeBatchSizeInput,
};

const batchPresetOptionsDialogue = async (): Promise<void> => {
  const command = await select({
    message: chalk.bold.blue("What preset would you like to change:"),
    choices: Object.keys(batchPresetOptions), // all the keys will show up as options for the user
  });

  const userRequestedCmd =
    batchPresetOptions[command as keyof typeof batchPresetOptions];
  if (!userRequestedCmd) {
    printError(`Command "${command}" not found`);
  }

  await userRequestedCmd();
};

// Start the CLI
main();
