const _ = require("lodash");
const { spawn } = require("child_process");

/**
 * Basically https://gist.github.com/paulredmond/979798
 *
 * @param instances A bunch of stuff
 */
function tailInstances(instances, logFile) {
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
    const tail = spawn("ssh", [`ubuntu@${server}`, "tail", "-F", "-n100000", logFile]);

    tail.stdout.on("data", (data) => {
      readData(server, data);
    });
  });
}

module.exports = { tailInstances };