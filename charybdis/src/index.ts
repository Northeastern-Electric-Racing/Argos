import { Command } from "commander";
import { cli_args } from "./cli/cli-args";
import { startInteractiveCLI } from "./cli/cli-interactive";

export async function main() {
  // if there are no more than the arguments required to start the program run the interactive CLI
  if (process.argv.length <= 2) {
    await startInteractiveCLI();
    return;
  }

  // otherwise parse the command line arguments, and run the commands using the cli_args function
  const program = new Command();
  program
    .option("-c, --command <cmd>", "Command to run")
    .option("-b, --batch <batchParams...>", "Set batch parameter")
    .option("--url-local <localUrl>", "Set local DB URL")
    .option("--url-cloud <cloudUrl>", "Set cloud DB URL");

  program.parse(process.argv);

  await cli_args(program);
}

main();
