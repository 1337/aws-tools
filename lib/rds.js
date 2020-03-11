const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const AWS = require("aws-sdk");
const _ = require("lodash");
const common = require("./common");

class RDSAdapter {
  constructor(profile, region) {
    const credentials = common.getCredentials(profile);
    this.realRds = new AWS.RDS({
      credentials,
      region,
      apiVersion: "2016-11-15"
    });
  }

  async getDBLogFileNames(instanceId) {
    const {
      DescribeDBLogFiles: logFiles
    } = await this.realRds
      .describeDBLogFiles({ DBInstanceIdentifier: instanceId })
      .promise();

    return _(logFiles)
      .map("LogFileName")
      .value();
  }

  async downloadDBLog(instanceId, logFile) {
    const localPath = `/tmp/rdslogs/${instanceId}/${logFile}`;

    if (fs.existsSync(localPath)) {
      console.log(`File ${localPath} exists, skipping download.`);
      return;
    }

    const { LogFileData: fileData } = await this.realRds
      .downloadDBLogFilePortion({
        DBInstanceIdentifier: instanceId,
        LogFileName: logFile
      })
      .promise();

    await fsp.mkdir(path.dirname(localPath), { recursive: true });
    await fsp.writeFile(localPath, fileData);
    console.log(`The file was saved to ${localPath}`);
  }

  async downloadRDSLogs(instanceId) {
    const logs = await this.getDBLogFileNames(instanceId);
    await Promise.all(
      _.map(logs, log => {
        return this.downloadDBLog(instanceId, log);
      })
    );
  }

  async getSlowestQueries() {}
}

module.exports = {
  RDSAdapter
};
