const _ = require("lodash");

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
      [tag.Key]: tag.Value,
    })),
    VPC: instance.VpcId,
  };
}

module.exports = { instanceToInstance };