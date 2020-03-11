#!/usr/bin/env node

const AWS = require("aws-sdk");
const _ = require("lodash");

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

function _getRDSLogs(profile, region, instanceId) {
    console.log(`${profile} ${region} ${instanceId}`);

    const credentials = new AWS.SharedIniFileCredentials({profile});
    return new Promise((resolve, reject) => {
        rds.getDBLogs(
            credentials,
            region,
            instanceId
        ).then((logs) => {
            console.log(logs);
            resolve(logs);
        }, (error) => {
            reject(error);
        });
    });
}

function _downloadRDSLog(profile, region, instanceId, logFile) {
    console.log(`${profile} ${region} ${instanceId}`);

    const credentials = new AWS.SharedIniFileCredentials({profile});
    rds.downloadDBLog(
        credentials,
        region,
        instanceId,
        logFile
    ).then((logs) => {
        console.log(logs);
    });
}

async function _downloadRDSLogs(profile, region, instanceId) {
    console.log(`${profile} ${region} ${instanceId}`);

    const logs = await _getRDSLogs(profile, region, instanceId);
    await Promise.all(
        _.map(logs, (log) => {
            return _downloadRDSLog(profile, region, instanceId, log);
        })
    );
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
        return yargs
            .usage('usage: $0 rds <foo>')
            .command('log-files', 'Get log file names.', (yargs) => {
                yargs.demandOption(['instance-id']);
                const argv = yargs.argv;
                _getRDSLogs(
                    argv.profile || "default",
                    argv.region || "us-east-1",
                    argv['instance-id']
                );
            })
            .command('download-log', 'Download a file to /tmp/.', (yargs) => {
                yargs.demandOption(['instance-id', 'log-file']);
                const argv = yargs.argv;
                _downloadRDSLog(
                    argv.profile || "default",
                    argv.region || "us-east-1",
                    argv['instance-id'],
                    argv['log-file'],
                );
            })
            .command('download-logs', 'Download all logs to /tmp/.', async (yargs) => {
                yargs.demandOption(['instance-id']);
                const argv = yargs.argv;
                await _downloadRDSLogs(
                    argv.profile || "default",
                    argv.region || "us-east-1",
                    argv['instance-id']
                );
            })
            .command('slowest-queries', 'Slowest queries', (yargs) => {
                yargs.demandOption(['instance-id']);
                console.log('creating project :)');
            })
            .demand(1, "Must provide a valid subcommand.");
    })
    .demand(1, "Must provide a valid command.")
    .argv;

_(argv);  // Wtf? If you don't access argv it doesn't work?
