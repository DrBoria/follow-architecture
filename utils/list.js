"use strict";

// List normalization shared by every entity: a config value that may be either
// a single item or an array of items becomes a string array.

const listOf = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]).map(String);

module.exports = { listOf };
