"use strict";

// The ACCESS GRAPH helpers: the vocabulary of action kinds, the homes a role
// may live in, and the "same instance" question for a repeating node. Split
// from the builder so each file stays small and the decisions are named.

import { segmentsOf } from "../../../entities/location";
import { admitsWhenNoneReject } from "../../../utils/gate";
import { FACT_KINDS } from "../../../entities/kinds";
import type { Arch, CodeRoles } from "../../../entities/architecture";
import type { NodeSummary } from "../../../entities/overview-summaries";

// Two node templates address the same instance when their DIRECTORY segments
// agree position by position: literals must be equal, a placeholder on both
// sides lines up, and a placeholder against a literal cannot be the same folder.
// "The same instance" only constrains a node that CAN repeat: the root store is
// declared once, so every action may import it (the engine's own rule).
const isVar = (s: string): boolean => /^\{[^}]+\}$/.test(s);
const dirsOf = (node: NodeSummary): string[] => segmentsOf(node.paths[0]).slice(0, -1);

const dirsAgree = (da: string[], db: string[]): boolean => {
	if (da.length !== db.length) return false;
	return da.every((seg, i) => (isVar(seg) && isVar(db[i]) ? true : seg === db[i]));
};

const sameInstance = (a: NodeSummary, b: NodeSummary): boolean => {
	const single = !isVar(segmentsOf(b.paths[0]).at(-1) ?? "");
	const repeats = dirsOf(b).some(isVar);
	return admitsWhenNoneReject({ a, b }, [() => !single, () => repeats && !dirsAgree(dirsOf(a), dirsOf(b))]);
};

// The action names the config uses, in declaration order: the relation
// vocabulary first, then any name the config invented. A kind no role mentions
// is still listed — "0 edges" is a fact about the architecture, not a gap.
const actionKinds = (roles: CodeRoles): string[] => {
	const kinds = [...FACT_KINDS];
	const seen = new Set(kinds);
	for (const def of Object.values(roles)) {
		for (const kind of Object.keys(def.actions ?? {})) {
			if (seen.has(kind)) continue;
			seen.add(kind);
			kinds.push(kind);
		}
	}
	return kinds;
};

// Folders a role may live in: the node children that declare `role:`. A role
// with no such child cannot appear on this graph.
const homesOf = (slug: string, arch: Arch, bySlug: Map<string, NodeSummary>): NodeSummary[] => {
	const out: NodeSummary[] = [];
	for (const h of arch.nodes.roleHomes[slug] ?? []) {
		const node = h.node ? bySlug.get(h.node) : undefined;
		if (node && !out.includes(node)) out.push(node);
	}
	return out;
};

// Which roles live in a folder — so an arrow can be attributed to the role that
// OWNS the source side, not only to the role it points at.
const rolesAtNode = (roles: CodeRoles, arch: Arch, nodes: readonly NodeSummary[], bySlug: Map<string, NodeSummary>): Map<string, string[]> => {
	const map = new Map<string, string[]>(nodes.map((n) => [n.slug, []]));
	for (const slug of Object.keys(roles)) {
		for (const node of homesOf(slug, arch, bySlug)) map.get(node.slug)?.push(slug);
	}
	return map;
};

export { sameInstance, actionKinds, homesOf, rolesAtNode };
