"use strict";

// Normalize the YAML `aliases` section: a flat map of alias name → path.
// Paths are normalized to forward slashes with no trailing slash.

const { pipe, map, entries, fromEntries } = require("remeda");

// `fromEntries` matters: `pathsOf` reads the map with `Object.entries`, and an
// array of pairs read that way is `{ "0": [...] }` — every alias lost.
const normalizeAliases = (raw) => {
	const entriesRaw = raw && typeof raw === "object" ? raw : {};
	return pipe(
		entries(entriesRaw),
		map(([k, v]) => [String(k), String(v).replace(/\\/g, "/").replace(/\/+$/, "")]),
		fromEntries(),
	);
};

module.exports = { normalizeAliases };
