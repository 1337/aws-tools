const AWS = require("aws-sdk");
const _ = require("lodash");
const { instanceToInstance } = require('./orm');

async function getInstances(credentials, region) {
  const ec2 = new AWS.EC2({
    credentials,
    region,
    apiVersion: "2016-11-15",
  });
  const {
    Reservations: reservations,
  } = await ec2.describeInstances().promise();

  return _(reservations)
    .map(res => res.Instances || [])
    .flatten()
    .map(instanceToInstance)
    .value();
}

function filterInstancesByTag(instances, tag) {
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


module.exports = { getInstances, filterInstancesByTag };