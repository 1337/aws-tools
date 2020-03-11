const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const AWS = require("aws-sdk");
const _ = require("lodash");

async function getCredentials(profile) {
    return new AWS.SharedIniFileCredentials({profile});
}

module.exports = {getCredentials};
