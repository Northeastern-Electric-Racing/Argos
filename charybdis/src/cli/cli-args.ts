import { Command } from "commander";
import {
  BATCH_SIZE_OPTIONS,
  CHANGE_DB_URL_OPTIONS,
  COMMAND_OPTIONS,
  UPLOAD_DUMP_FOLDER_OPTIONS,
} from "./cmd-options";

export async function cli_args(program: Command) {
  const options = program.opts();

  if (options.urlLocal) {
    CHANGE_DB_URL_OPTIONS["set-local-db"](options.urlLocal);
  }

  if (options.urlCloud) {
    CHANGE_DB_URL_OPTIONS["set-cloud-db"](options.urlCloud);
  }

  if (options.batch) {
    const batchArray = options.batch as string[];
    for (let i = 0; i < batchArray.length; i += 2) {
      const key = batchArray[i] as keyof typeof BATCH_SIZE_OPTIONS,
        size = batchArray[i + 1];
      if (BATCH_SIZE_OPTIONS[key]) {
        await BATCH_SIZE_OPTIONS[key](Number(size));
      }
    }
  }

  if (options.uploadDumpFolder) {
    const dumpArgs = options.uploadDumpFolder as string[];

    if (!dumpArgs.length) {
      console.error(
        "No upload-dump-folder option specified. Must be one of: [most-recent, all-downloads, specific-folder]."
      );
      process.exit(1);
    }

    const choice = dumpArgs[0]; // "most-recent", "all-downloads", or "specific-folder"

    switch (choice) {
      case "most-recent":
        await UPLOAD_DUMP_FOLDER_OPTIONS["most-recent"]();
        break;

      case "all-downloads":
        await UPLOAD_DUMP_FOLDER_OPTIONS["all-downloads"]();
        break;

      case "specific-folder":
        const folderName = dumpArgs[1];
        if (!folderName) {
          console.error(
            "Please specify which folder to upload, e.g. --upload-dump-folder specific-folder myFolderName"
          );
          process.exit(1);
        }
        try {
          await UPLOAD_DUMP_FOLDER_OPTIONS["specific-folder"](folderName);
        } catch (error: any) {
          // If no audit log found:
          if (error.code === "ENOENT") {
            console.log("Audit log file does not exist.");
            process.exit(0);
          }
          // Otherwise rethrow the error
          throw error;
        }
        break;

      default:
        console.error(
          `Invalid upload-dump-folder option: ${choice}. Must be one of: [most-recent, all-downloads, specific-folder].`
        );
        process.exit(1);
    }
  }

  if (options.command) {
    const cmd = options.command as keyof typeof COMMAND_OPTIONS;
    await COMMAND_OPTIONS[cmd]();
    process.exit(0);
  }
}
