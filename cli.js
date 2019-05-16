#!/usr/bin/env node

const AWS = require("aws-sdk");
const uuid = require("uuid");
const _ = require("lodash");
const argv = require("yargs").demandOption(["tag"]).argv;
const {exec, spawn} = require('child_process');
const shell = require('shelljs');
// var sys = require('sys');

let profile = argv.profile || "default";
let region = argv.region || "us-east-1";
let tag = argv.tag;
let logFile = argv['log-file'] || "/var/log/rideco/web/web.log";

console.log(`${profile} ${region} ${tag}`);

const credentials = new AWS.SharedIniFileCredentials({profile});

async function getInstances() {
  let ec2 = new AWS.EC2({credentials, region, apiVersion: "2016-11-15"});

  let {Reservations: reservations} = await ec2.describeInstances().promise();
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
    return !_.isEmpty(_.filter(tags, _.matches({Name: tag})));
  });
}

function tailInstances(instances) {

  function getMultitailArgs(instances) {
    const ips = _.map(instances, 'publicIP');
    let multiTailArgs = _.map(ips, ip => {
      return ['-l', `'ssh ubuntu@${ip} "tail -F ${logFile}"'`];
    });
    multiTailArgs.unshift('--mergeall');
    multiTailArgs = _.flattenDeep(multiTailArgs);
    return multiTailArgs;
  }

  function getCmd(args) {
    return 'multitail ' + args.join(' ');
  }

  let multiTailArgs = getMultitailArgs(instances);
  console.log(multiTailArgs);
  const cmd = getCmd(multiTailArgs);
  console.log('multitail ' + multiTailArgsStr);

  // var child = exec(cmd, function(code, stdout, stderr) {
  //   console.log('Exit code:', code);
  //   console.log('Program output:', stdout);
  //   console.log('Program stderr:', stderr);
  // });

  // const tail = spawn('multitail', multiTailArgs, {
  //   // cwd: process.cwd(),
  //   // detached: true,
  //   // shell: true,
  //   // stdio: "inherit"
  // });
  // // const tail = exec('multitail ' + multiTailArgsStr);
  // tail.stdout.on('data', function (data) {
  //   console.log(data);
  // });
}


getInstances().then(async instances => {
  const taggedInstances = await filterInstancesByTag(instances, tag);

  tailInstances(taggedInstances);
});