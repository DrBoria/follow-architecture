"use strict";

// The tree: where files may live. build.js, match.js, entries.js.

import { buildTree } from "./build";
import { matchNode, deepestMatch, folderOwner, instanceAt, ancestorsAreReal, targetCapsFor } from "./match";
import { checkTree } from "./entries";
import type { Arch } from "../architecture";

const matchers = (arch: Arch): ((rel: string) => boolean) => {
	const nodeRes = arch.nodes.all.flatMap((n) => n.variants.map((v) => v.re));
	const invGlobs = arch.invariants.map((i) => i.where).filter((w) => Array.isArray(w) && w.length > 0);
	return (rel) => nodeRes.some((re) => re.test(rel)) || invGlobs.some((globs) => globs.some((g) => (g.re ? g.re.test(rel) : false)));
};

export { buildTree, checkTree, matchers, matchNode, deepestMatch, folderOwner, instanceAt, targetCapsFor, ancestorsAreReal };
