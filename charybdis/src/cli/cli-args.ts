import { Command } from "commander";
import {
  BATCH_SIZE_OPTIONS,
  CHANGE_DB_URL_OPTIONS,
  COMMAND_OPTIONS,
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
      const key = batchArray[i],
        size = batchArray[i + 1];
      if (BATCH_SIZE_OPTIONS[key]) {
        await BATCH_SIZE_OPTIONS[key](Number(size));
      }
    }
  }

  if (options.command && COMMAND_OPTIONS[options.command]) {
    await COMMAND_OPTIONS[options.command]();
    process.exit(0);
  }
}
