"use strict";
const { matches } = require("../utils/queries");
const { compilePattern } = require("../utils/pattern");

// The nodes connector evaluates `allowedFrom` entries against a file's facts.
// Each entry is one of:
//   {type: "glob", glob}    → glob pattern match against the file's relative path
//   {type: "node", node}    → file is under the referenced node's path prefix
//   {type: "query", query}  → query filter evaluated via matches() against file facts
//
// `targetCaps` (optional) holds the placeholder captures of the TARGET file
// (the file being imported/called). A placeholder in a glob that shares a name
// with a target capture must equal the target's value — e.g.
// `apps/backend/{kebab-case}/store.ts` only matches the store of the SAME
// feature as the target (`document/store.ts` for a target in `document/...`).
const entryMatches = (entry, fileRel, arch, facts, targetCaps) => {
	if (entry.type === "glob") {
		const { re, names } = compilePattern(entry.glob);
		const m = re.exec(fileRel);
		if (!m) return false;
		if (targetCaps) {
			for (let i = 0; i < names.length; i += 1) {
				const cap = m[i + 1];
				if (names[i] in targetCaps && cap !== targetCaps[names[i]]) return false;
			}
		}
		return true;
	}
	if (entry.type === "node") {
		const node = arch.nodes.bySlug[entry.node];
		if (!node) return false;
		// Check if the file is under any variant of the referenced node
		return node.variants.some((v) => v.re.test(fileRel));
	}
	// query: evaluate the filter against the file's facts
	return matches(facts, entry.query, { arch, fileRel });
};

// Checks whether a file is allowed to import/use a symbol declared under `node`.
// Returns null if allowed, or a string description of the violation if not.
const checkAllowedFrom = (entries, fileRel, arch, facts, targetCaps) => {
	if (entries == null) return null; // no restriction
	for (const entry of entries) {
		if (entryMatches(entry, fileRel, arch, facts, targetCaps)) return null;
	}
	// Build a human-readable description of what WAS allowed
	const allowed = entries.map((e) => {
		if (e.type === "glob") return e.glob;
		if (e.type === "node") return `node:${e.node}`;
		return "query";
	});
	return `allowed from: ${allowed.join(", ")}`;
};

module.exports = { checkAllowedFrom, entryMatches };
