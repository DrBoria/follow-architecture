"use strict";

// The tree: where files may live. build.js, match.js, entries.js.

const { buildTree } = require("./build");
const { matchNode, deepestMatch, folderOwner, instanceAt, ancestorsAreReal, targetCapsFor } = require("./match");
const { checkTree } = require("./entries");

const matchers = (arch) => {
	const nodeRes = arch.nodes.all.flatMap((n) => n.variants.map((v) => v.re));
	const invGlobs = arch.invariants.map((i) => i.where).filter((w) => Array.isArray(w) && w.length > 0);
	return (rel) => nodeRes.some((re) => re.test(rel)) || invGlobs.some((globs) => globs.some((g) => g.re.test(rel)));
};

module.exports = { buildTree, checkTree, matchers, matchNode, deepestMatch, folderOwner, instanceAt, targetCapsFor, ancestorsAreReal };
