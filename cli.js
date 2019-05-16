#!/usr/bin/env node

const AWS = require("aws-sdk");
const uuid = require("uuid");
const _ = require("lodash");
const argv = require("yargs").demandOption(["tag"]).argv;
const { exec, spawn } = require("child_process");
const shell = require("shelljs");

const profile = argv.profile || "default";
const region = argv.region || "us-east-1";
const tag = argv.tag;
const logFile = argv["log-file"] || "/var/log/**/*.log";
const credentials = new AWS.SharedIniFileCredentials({ profile });
console.log(`${profile} ${region} ${tag}`);

async function getInstances() {
  let ec2 = new AWS.EC2({ credentials, region, apiVersion: "2016-11-15" });

  let { Reservations: reservations } = await ec2.describeInstances().promise();
  let instances = _.flatten(_.map(reservations, res => res.Instances));

  function instanceToInstance(instance) {
    return {
      clientToken: instance.ClientToken,
      imageId: instance.ImageId,
      instanceId: instance.InstanceId,
      instanceType: instance.InstanceType,
      keyName: instance.KeyName,
      state: instance.State.Name,
      publicIP: instance.PublicIpAddress,
      tags: _.map(instance.Tags || [], tag => ({
        [tag.Key]: tag.Value
      })),
      VPC: instance.VpcId
    };
  }

  return _.map(instances, instanceToInstance);
}

async function filterInstancesByTag(instances, tag) {
  return _.filter(instances, instance => {
    const tags = instance.tags || [];
    return !_.isEmpty(_.filter(tags, _.matches({ Name: tag })));
  });
}

function tailInstances(instances) {
  const ips = _.map(instances, "publicIP");

  // https://gist.github.com/paulredmond/979798
  function writeData(host, data) {
    console.log(host + ": " + data);
  }

  function readData(host, data) {
    const lines = data.toString().split("\n");
    for (let i = 0, len = lines.length; i < len; i++) {
      if (lines[i].length > 0) {
        writeData(host, lines[i]);
      }
    }
  }

  _.map(ips, server => {
    const tail = spawn("ssh", [`ubuntu@${server}`, "tail", "-F", logFile]);

    tail.stdout.on("data", function(data) {
      readData(server, data);
    });
  });
}

getInstances().then(async instances => {
  const taggedInstances = await filterInstancesByTag(instances, tag);

  tailInstances(taggedInstances);
});
