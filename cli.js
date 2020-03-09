#!/usr/bin/env node

const AWS = require("aws-sdk");

const ec2 = require('./lib/ec2');
const rds = require('./lib/rds');
const {tailInstances} = require('./lib/shell');


function _tailEC2(profile, region, tag, logFile) {
    console.log(`${profile} ${region} ${tag}`);

    const credentials = new AWS.SharedIniFileCredentials({profile});
    ec2.getInstances(credentials, region).then(instances => {
        const taggedInstances = ec2.filterInstancesByTag(instances, tag);

        tailInstances(taggedInstances, logFile);
    });
}

const yargs = require('yargs');
// Just copied from
// https://github.com/yargs/yargs/issues/225#issuecomment-128532719
// https://github.com/yargs/yargs/issues/225#issuecomment-206455415
const argv = yargs
    .usage('usage: $0 <command>')
    .command('ec2', 'Access EC2 logs.', (yargs) => {
        yargs.demandOption(["tag"]);
        const argv = yargs.argv;

        _tailEC2(
            argv.profile || "default",
            argv.region || "us-east-1",
            argv.tag,
            argv["log-file"] || "/var/log/**/*.log"
        );
    })
    .command('rds', 'Access RDS logs.', (yargs) => {
        var subYargs = yargs
            .usage('usage: $0 rds <foo>')
            .command('slowest-queries', 'Slowest queries', (yargs) => {
                console.log('creating project :)');
            })
            .command('queries', 'Latest queries', (yargs) => {
                console.log('creating module :)');
            })
            .demand(1, "must provide a valid subcommand");
        return subYargs;
    })
    .demand(1, "Must provide a valid command")
    .argv;
