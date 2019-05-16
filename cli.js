#!/usr/bin/env node

const AWS = require("aws-sdk");
const _ = require("lodash");
const argv = require("yargs").demandOption(["tag"]).argv;
const { spawn } = require("child_process");
const { getEC2Instances, filterInstancesByTag } = require('./lib/ec2');

const profile = argv.profile || "default";
const region = argv.region || "us-east-1";
const tag = argv.tag;
const logFile = argv["log-file"] || "/var/log/**/*.log";
const credentials = new AWS.SharedIniFileCredentials({ profile });

console.log(`${profile} ${region} ${tag}`);

// Basically https://gist.github.com/paulredmond/979798
function tailEC2Instances(instances) {
  const ips = _.map(instances, "publicIP");

  function readData(host, data) {
    const lines = data.toString().split("\n");
    _.each(lines, line => {
      if (lines.length > 0) {
        console.log(`${host}: ${line}`);
      }
    });
  }

  _.map(ips, server => {
    const tail = spawn("ssh", [`ubuntu@${server}`, "tail", "-F", logFile]);

    tail.stdout.on("data", (data) => {
      readData(server, data);
    });
  });
}

getEC2Instances(credentials, region).then(async instances => {
  const taggedInstances = filterInstancesByTag(instances, tag);

  tailEC2Instances(taggedInstances);
});
