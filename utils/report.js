"use strict";

// Re-export shim: asReport lives in the report module — the single place
// that owns report normalization for every entity.
module.exports = { asReport: require("../report/report").asReport };
