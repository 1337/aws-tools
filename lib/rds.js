const AWS = require("aws-sdk");
const _ = require("lodash");
// const { instanceToInstance } = require('./orm');
//
// async function getInstances(credentials, region) {
//     const rds = new AWS.RDS({
//         credentials,
//         region,
//         apiVersion: "2016-11-15",
//     });
//
//     // const {
//     //     Reservations: reservations,
//     // } = await rds.describeDBInstances().promise();
//     const foo = await rds.describeDBInstances().promise();
//
//     debugger;
//
//     return _(reservations)
//         .map(res => res.Instances || [])
//         .flatten()
//         .map(instanceToInstance)
//         .value();
// }
//
//
// module.exports = { getInstances, filterInstancesByTag };
