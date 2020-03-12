const _ = require("lodash");

function normalizeQueryUUID(query) {
  return query.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    "..."
  );
}

function stripQueryTimes(query) {
  return query.replace(/^20.+LOG:\s+/gi, "");
}

function stripWhenThen(query) {
  return (
    query
      .replace(/[TW]HEN [^\s]+/gi, "")
      // Strip extra spaces too
      .replace(/\s+/gi, " ")
      .trim()
  );
}

function getQueriesWithTimes(queries) {
  return _(queries)
    .filter(query => query.indexOf("LOG:  duration") > -1)
    .value();
}

function sortQueriesByTime(queries) {
  return _(queries)
    .sortBy(query => {
      let hasMatches = query.match(/duration: (\d+\.\d+) ms/);
      if (hasMatches) {
        return parseFloat(hasMatches[1]);
      }
      return -1;
    })
    .reverse()
    .value();
}

/**
 * Only lines starting with a date are new lines.
 * The rest may be multi-line queries.
 */
function fileToLines(file) {
  const lines = file.split("\n");
  const lines2 = [];
  _.each(lines, line => {
    if (line.indexOf("20") === 0) {
      lines2.push(line);
    } else {
      lines2[lines2.length - 1] += " " + line;
    }
  });
  return lines2;
}

module.exports = {
  getQueriesWithTimes,
  normalizeQueryUUID,
  fileToLines,
  stripWhenThen,
  sortQueriesByTime
};
