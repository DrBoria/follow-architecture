"use strict";

// Normalize the YAML `aliases` section: a flat map of alias name → path.
// Paths are normalized to forward slashes with no trailing slash.

const { pipe, map, entries } = require("remeda");

const normalizeAliases = (raw) => {
	const entriesRaw = raw && typeof raw === "object" ? raw : {};
	return pipe(
		entries(entriesRaw),
		map(([k, v]) => [String(k), String(v).replace(/\\/g, "/").replace(/\/+$/, "")]),
	);
};

module.exports = { normalizeAliases };
