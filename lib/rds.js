const fs = require("fs-extra");
const path = require("path");

const _ = require("lodash");
const AWS = require("aws-sdk");

const common = require("./common");
const {
  stripWhenThen,
  fileToLines,
  normalizeQueryUUID,
  getQueriesWithTimes,
  sortQueriesByTime
} = require("./query");

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

  /**
   * Stuff from https://github.com/aws/aws-sdk-js/issues/1292#issuecomment-272605478
   */
  async getDBLog(instanceId, logFile, marker = "0") {
    const self = this;
    let buffer = "";

    if (marker && marker !== "0") {
      console.log(`Getting part ${marker} of ${logFile}`);
    }
    let resp = await this.realRds
      .downloadDBLogFilePortion({
        DBInstanceIdentifier: instanceId,
        LogFileName: logFile,
        Marker: marker
      })
      .promise();

    const logData = resp.LogFileData;
    if (!logData) {
      return "";
    }
    buffer += logData;

    if (resp.AdditionalDataPending) {
      let log = await self.getDBLog(instanceId, logFile, resp.Marker);
      buffer += log;
    }
    return buffer;
  }

  async downloadDBLog(instanceId, logFile) {
    const localPath = `/tmp/rdslogs/${instanceId}/${logFile}`;

    // console.log(`Downloading ${logFile} to ${localPath}`);
    if (fs.existsSync(localPath)) {
      // console.log(`File ${localPath} exists, skipping download.`);
      return fs.readFileSync(localPath).toString();
    }
    const log = await this.getDBLog(instanceId, logFile);

    if (log && log.length) {
      fs.ensureDirSync(path.dirname(localPath));
      fs.writeFileSync(localPath, log);
      console.log(`New log file saved to ${localPath}`);
    }
    return log;
  }

  async downloadDBLogs(instanceId) {
    const logs = await this.getDBLogFileNames(instanceId);
    const logContents = [];

    for (let i = 0; i < logs.length; i++) {
      // Don't download simultaneously. They'll get throttled and die
      logContents.push(await this.downloadDBLog(instanceId, logs[i]));
    }
    return logContents;
  }

  async getSlowestQueries(instanceId, limit = 100) {
    const logContents = await this.downloadDBLogs(instanceId);
    let output = [];
    _.each(logContents, logContent => {
      const logLines = fileToLines(logContent);
      getQueriesWithTimes(logLines)
        .map(normalizeQueryUUID)
        .map(stripWhenThen)
        .map(query => {
          output.push(query);
        });
    });
    output = sortQueriesByTime(output).slice(0, limit);
    return output;
  }
}

module.exports = {
  RDSAdapter
};
