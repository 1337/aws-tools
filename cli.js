#!/usr/bin/env node

const AWS = require("aws-sdk");
const _ = require("lodash");
const argv = require("yargs").demandOption(["tag"]).argv;
const { exec, spawn } = require("child_process");

const profile = argv.profile || "default";
const region = argv.region || "us-east-1";
const tag = argv.tag;
const logFile = argv["log-file"] || "/var/log/**/*.log";
const credentials = new AWS.SharedIniFileCredentials({ profile });

console.log(`${profile} ${region} ${tag}`);

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

async function getEC2Instances() {
  const ec2 = new AWS.EC2({
    credentials,
    region,
    apiVersion: "2016-11-15"
  });
  const {
    Reservations: reservations
  } = await ec2.describeInstances().promise();

  return _(reservations)
    .map(res => res.Instances || [])
    .flatten()
    .map(instanceToInstance)
    .value();
}

async function filterInstancesByTag(instances, tag) {
  function instanceHasTag(instance) {
    const tags = instance.tags || [];
    return !_(tags)
      .filter(_.matches({ Name: tag }))
      .isEmpty();
  }

  return _(instances)
    .filter(instanceHasTag)
    .value();
}

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

    tail.stdout.on("data", function(data) {
      readData(server, data);
    });
  });
}

getEC2Instances().then(async instances => {
  const taggedInstances = await filterInstancesByTag(instances, tag);

  tailEC2Instances(taggedInstances);
});
