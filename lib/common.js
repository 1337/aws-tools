const AWS = require("aws-sdk");

function getCredentials(profile) {
  return new AWS.SharedIniFileCredentials({ profile });
}

module.exports = { getCredentials };
