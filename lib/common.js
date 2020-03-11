const fs = require("fs");

const AWS = require("aws-sdk");
const _ = require("lodash");

function getCredentials(profile) {
  return new AWS.SharedIniFileCredentials({ profile });
}

module.exports = { getCredentials };
