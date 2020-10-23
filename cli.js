#!/usr/bin/env node

const _ = require("lodash");
const yargs = require("yargs");

const ec2 = require("./lib/ec2");
const rds = require("./lib/rds");

const DEFAULT_REGION = "us-east-1";
const DEFAULT_PROFILE = "default";

// Just copied from
// https://github.com/yargs/yargs/issues/225#issuecomment-128532719
// https://github.com/yargs/yargs/issues/225#issuecomment-206455415
const argv = yargs
  .usage("usage: $0 (command)")
  .demand(1, "Must provide a valid command.")
  .command("ec2", "Access EC2 logs.", yargs => {
    return yargs
      .usage("usage: $0 ec2")
      .command("log-files", "Tail log files.", async yargs => {
        yargs.demandOption(["tag"]);
        const argv = yargs.argv;
        const adapter = new ec2.EC2Adapter(
          argv.profile || DEFAULT_PROFILE,
          argv.region || DEFAULT_REGION
        );

        adapter.tailInstancesByTag(
          argv.tag,
          argv["log-file"] || "/var/log/**/*.log"
        );
      })
      .command(
        "run-command <command>",
        "Run a command on all remote hosts. Interactive commands like `top` and `pdb` are not supported.",
        async yargs => {
          yargs.demandOption(["tag"]);
          const argv = yargs.argv;
          const adapter = new ec2.EC2Adapter(
            argv.profile || DEFAULT_PROFILE,
            argv.region || DEFAULT_REGION
          );

          adapter.runCommandByTag(argv.tag, argv._[2]);
        }
      )
      .command(
        "run-script <script-file>",
        "Run a script by copying it to all remote hosts and running it.",
        async yargs => {
          yargs.demandOption(["tag"]);
          const argv = yargs.argv;
          const adapter = new ec2.EC2Adapter(
            argv.profile || DEFAULT_PROFILE,
            argv.region || DEFAULT_REGION
          );

          adapter.runScriptByTag(argv.tag, argv._[2]);
        }
      )
      .command("ssh", "SSH into one of the instances.", async yargs => {
        yargs.demandOption(["instance-id"]);
        const argv = yargs.argv;
        const adapter = new ec2.EC2Adapter(
          argv.profile || DEFAULT_PROFILE,
          argv.region || DEFAULT_REGION
        );

        adapter.startSSHByInstanceId(argv["instance-id"]);
      })
      .command(
        "ssh-any",
        "SSH into any of the instances with a specific tag.",
        async yargs => {
          yargs.demandOption(["tag"]);
          const argv = yargs.argv;
          const adapter = new ec2.EC2Adapter(
            argv.profile || DEFAULT_PROFILE,
            argv.region || DEFAULT_REGION
          );

          adapter.startSSHAny(argv.tag);
        }
      )
      .demand(1, "Must provide a valid subcommand.");
  })
  .command("rds", "Access RDS logs.", yargs => {
    return yargs
      .usage("usage: $0 rds")
      .command("log-files", "Get log file names.", async yargs => {
        yargs.demandOption(["instance-id"]);
        const argv = yargs.argv;
        const adapter = new rds.RDSAdapter(
          argv.profile || DEFAULT_PROFILE,
          argv.region || DEFAULT_REGION
        );
        const logNames = await adapter.getDBLogFileNames(argv["instance-id"]);
        console.log(logNames);
      })
      .command("download-log", "Download a file to /tmp/.", async yargs => {
        yargs.demandOption(["instance-id", "log-file"]);
        const argv = yargs.argv;
        const adapter = new rds.RDSAdapter(
          argv.profile || DEFAULT_PROFILE,
          argv.region || DEFAULT_REGION
        );
        await adapter.downloadDBLog(argv["instance-id"], argv["log-file"]);
      })
      .command("download-logs", "Download all logs to /tmp/.", async yargs => {
        yargs.demandOption(["instance-id"]);
        const argv = yargs.argv;
        const adapter = new rds.RDSAdapter(
          argv.profile || DEFAULT_PROFILE,
          argv.region || DEFAULT_REGION
        );
        await adapter.downloadDBLogs(argv["instance-id"]);
      })
      .command(
        "slowest-queries",
        "Show slowest queries on that instance.",
        async yargs => {
          yargs
            .default("limit", 100, "The number of queries to show (100).")
            .demandOption(["instance-id"]);
          const argv = yargs.argv;
          const adapter = new rds.RDSAdapter(
            argv.profile || DEFAULT_PROFILE,
            argv.region || DEFAULT_REGION
          );
          const queries = await adapter.getSlowestQueries(
            argv["instance-id"],
            argv.limit
          );
          _.each(queries, query => {
            console.log(query);
          });
        }
      )
      .demand(1, "Must provide a valid subcommand.");
  }).argv;

_(argv); // Wtf? If you don't access argv it doesn't work?
