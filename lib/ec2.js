const AWS = require("aws-sdk");
const _ = require("lodash");
const { instanceToInstance } = require("./orm");
const { spawn } = require("child_process");
const common = require("./common");

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

  /**
   * Basically https://gist.github.com/paulredmond/979798
   */
  _tailInstances(instances, logFile) {
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
      const tail = spawn("ssh", [
        `ubuntu@${server}`,
        "tail",
        "-F",
        "-n100000",
        logFile
      ]);

      tail.stdout.on("data", data => {
        readData(server, data);
      });
    });
  }

  tailInstancesByTag(tag, logFile) {
    this._getInstances().then(instances => {
      const taggedInstances = this._filterInstancesByTag(instances, tag);

      this._tailInstances(taggedInstances, logFile);
    });
  }
}

module.exports = {
  EC2Adapter
};
