const AWS = require("aws-sdk");
const _ = require("lodash");
const { spawn, spawnSync } = require("child_process");
const path = require("path");

const { instanceToInstance } = require("./orm");
const common = require("./common");

function readData(host, data) {
  const lines = data.toString().split("\n");
  host = host.padStart(16);
  _.each(lines, line => {
    if (lines.length > 0) {
      console.log(`${host}: ${line}`);
    }
  });
}

class EC2Adapter {
  constructor(profile, region) {
    const credentials = common.getCredentials(profile);
    this.realEc2 = new AWS.EC2({
      credentials,
      region,
      apiVersion: "2016-11-15"
    });
  }

  async _getInstances() {
    const {
      Reservations: reservations
    } = await this.realEc2.describeInstances().promise();

    return _(reservations)
      .map(res => res.Instances || [])
      .flatten()
      .map(instanceToInstance)
      .value();
  }

  _filterInstancesByTag(instances, tag) {
    function _instanceHasTag(instance) {
      const tags = instance.tags || [];
      return !_(tags)
        .filter(_.matches({ Name: tag }))
        .isEmpty();
    }

    return _(instances)
      .filter(_instanceHasTag)
      .value();
  }

  _filterInstancesById(instances, instanceId) {
    console.log(instances);
    function _instanceHasId(instance) {
      return instance.instanceId === instanceId;
    }

    return _(instances)
      .filter(_instanceHasId)
      .value();
  }

  /**
   * Basically https://gist.github.com/paulredmond/979798
   */
  _tailInstances(instances, logFile) {
    return this._runCommand(instances, `tail -F -n1000 ${logFile}`);
  }

  /**
   * Basically https://stackoverflow.com/a/50589756/1558430
   */
  _runCommand(instances, command) {
    const ips = _.map(instances, "publicIP");

    _.map(ips, serverIP => {
      // console.log(`Running ${command} on ${serverIP}`);
      const tail = spawn("ssh", [`ubuntu@${serverIP}`, command]);

      tail.stdout.on("data", data => {
        readData(serverIP, data);
      });
    });
  }

  _runScript(instance, scriptFilePath) {
    scriptFilePath = path.resolve(scriptFilePath);
    const serverIP = instance.publicIP;
    const scriptFileName = path.basename(scriptFilePath);
    const remoteScriptFilePath = `/tmp/${scriptFileName}`;
    console.log(`Copying ${scriptFilePath} to ${remoteScriptFilePath}`);
    spawnSync("scp", [
      scriptFilePath,
      `ubuntu@${serverIP}:${remoteScriptFilePath}`
    ]);
    console.log(`Granting executable permissions to ${remoteScriptFilePath}`);
    spawnSync("ssh", [
      `ubuntu@${serverIP}`,
      `chmod u+x ${remoteScriptFilePath}`
    ]);
    console.log(`Executing ${remoteScriptFilePath}`);
    const shellProcess = spawn("ssh", [
      `ubuntu@${serverIP}`,
      remoteScriptFilePath
    ]);

    shellProcess.stdout.on("data", data => {
      readData(serverIP, data);
    });
  }

  async getInstancesByTag(tag) {
    const instances = await this._getInstances();
    return this._filterInstancesByTag(instances, tag);
  }

  async getInstanceById(instanceId) {
    const instances = await this._getInstances();
    return this._filterInstancesById(instances, instanceId)[0] || null;
  }

  tailInstancesByTag(tag, logFile) {
    this.getInstancesByTag(tag).then(taggedInstances => {
      this._tailInstances(taggedInstances, logFile);
    });
  }

  runCommandByTag(tag, command) {
    this.getInstancesByTag(tag).then(taggedInstances => {
      this._runCommand(taggedInstances, command);
    });
  }

  runScriptByTag(tag, scriptFile) {
    this.getInstancesByTag(tag).then(taggedInstances => {
      _.each(taggedInstances, instance => {
        this._runScript(instance, scriptFile);
      });
    });
  }

  /**
   * SSH into any one of the instances that have the tag.
   */
  startSSHAny(tag) {
    this.getInstancesByTag(tag).then(taggedInstances => {
      const randomInstance =
        taggedInstances[Math.floor(Math.random() * taggedInstances.length)];
      const serverIP = randomInstance.publicIP;
      console.log(`SSHing to ${serverIP}`);
      spawnSync("ssh", [`ubuntu@${serverIP}`], { stdio: "inherit" });
    });
  }

  startSSHByInstanceId(instanceId) {
    this.getInstanceById(instanceId).then(instance => {
      if (!instance) {
        throw new Error(`The instance ${instanceId} could not be found.`);
      }
      const serverIP = instance.publicIP;
      console.log(`SSHing to ${serverIP}`);
      spawnSync("ssh", [`ubuntu@${serverIP}`], { stdio: "inherit" });
    });
  }
}

module.exports = {
  EC2Adapter
};
