import { Command } from "commander";
import { cli_args } from "./cli/cli-args";
import { startInteractiveCLI } from "./cli/cli-interactive";

export async function main() {
  const program = new Command();
  program
    .option("-c, --command <cmd>", "Command to run")
    .option("-b, --batch <batchParams...>", "Set batch parameter")
    .option("--url-local <localUrl>", "Set local DB URL")
    .option("--url-cloud <cloudUrl>", "Set cloud DB URL");

  program.parse(process.argv);

  await cli_args(program);
  if (process.argv.length <= 2) {
    await startInteractiveCLI();
    return;
  }
}

main();
