const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const AWS = require("aws-sdk");
const _ = require("lodash");

async function getDBLogs(credentials, region, instanceId) {
    const rds = new AWS.RDS({
        credentials,
        region,
        apiVersion: "2016-11-15",
    });

    const {
        DescribeDBLogFiles: logFiles
    } = await rds.describeDBLogFiles({DBInstanceIdentifier: instanceId}).promise();

    return _(logFiles).map('LogFileName').value();
}

async function downloadDBLog(credentials, region, instanceId, logFile) {
    const rds = new AWS.RDS({
        credentials,
        region,
        apiVersion: "2016-11-15",
    });
    const localPath = `/tmp/rdslogs/${instanceId}/${logFile}`;

    if (fs.existsSync(localPath)) {
        console.log(`File ${localPath} exists, skipping download`);
        return;
    }

    const {LogFileData: fileData} = await rds.downloadDBLogFilePortion({
        DBInstanceIdentifier: instanceId,
        LogFileName: logFile
    }).promise();

    await fsp.mkdir(path.dirname(localPath), { recursive: true });
    await fsp.writeFile(localPath, fileData);
    console.log(`The file was saved to ${localPath}`);
}

module.exports = {getDBLogs, downloadDBLog};
