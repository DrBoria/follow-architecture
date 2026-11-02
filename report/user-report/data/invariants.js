"use strict";

// Invariant summaries: the YAML `infer` block is a nested query object.
// The overview turns each one into a short, readable condition
// ("subscriptions.length > 0", "descendants.some.kind = ClassDeclaration") so
// a reader can tell what the rule actually demands. `where` and `ignore` are
// `where` entries (utils/where.js) and are labelled by the same describer the
// engine uses — never `String(entry)`.

const CONTAINER_OPS = new Set(["some", "every", "none", "length", "where", "filter", "by"]);
// Report text is shown separately; it is not part of the condition.
const IGNORED = new Set(["report", "message", "fix", "key", "line"]);

const SCALAR_OPS = {
	gt: ">",
	gte: "≥",
	lt: "<",
	lte: "≤",
	equals: "=",
	in: "in",
	not: "≠",
	isSet: "is set",
	globMatches: "matches",
	matches: "matches",
};

const formatValue = (v) => {
	if (typeof v === "string") return v;
	if (typeof v === "number" || typeof v === "boolean") return String(v);
	return JSON.stringify(v);
};

const walk = (value, trail, out) => {
	if (value == null) return;
	if (Array.isArray(value)) {
		out.push({ path: trail.join("."), op: "=", value: formatValue(value) });
		return;
	}
	if (typeof value !== "object") {
		out.push({ path: trail.join("."), op: "=", value: formatValue(value) });
		return;
	}
	for (const [key, child] of Object.entries(value)) {
		if (IGNORED.has(key)) continue;
		if (CONTAINER_OPS.has(key)) {
			walk(child, [...trail, key], out);
		} else if (SCALAR_OPS[key]) {
			const op = SCALAR_OPS[key];
			out.push({ path: trail.join(".") || key, op, value: op === "is set" ? "" : formatValue(child) });
		} else {
			walk(child, [...trail, key], out);
		}
	}
};

const describeCondition = (query) => {
	const out = [];
	walk(query, [], out);
	// `descendants.some.kind = X` reads better than `.some` colliding mid-path.
	return out.map((c) => `${c.path} ${c.op} ${c.value}`.trim());
};

const summarizeRule = (entry, inv) => {
	const report = entry?.report ?? inv.report ?? null;
	return {
		conditions: describeCondition(entry ?? {}),
		message: report?.message ?? (typeof report === "string" ? report : null),
		fix: report?.fix ?? null,
	};
};

// A `where` entry as a human label: role, node, glob or "filter". Shared with
// the engine, so the report cannot describe a rule differently than it runs.
const labelOf = (entry) => (entry?.type === "role" ? `role ${entry.role}${entry.same ? " (same instance)" : ""}` : entry?.type === "node" ? `node ${entry.node}` : entry?.type === "glob" ? entry.glob : "filter");

const labelsOf = (entries) => (entries ?? []).map(labelOf);

const buildInvariants = (arch, findings) => {
	const rawList = arch.raw?.invariants ?? [];
	const rawById = new Map(rawList.map((i) => [String(i.id), i]));
	const counts = new Map();
	for (const f of findings) {
		const id = /^invariant:([^:]+)/.exec(f.dedupeKey ?? f.key ?? "")?.[1];
		if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
	}

	return (arch.invariants ?? []).map((inv) => {
		const raw = rawById.get(inv.id) ?? {};
		return {
			id: inv.id,
			node: inv.node,
			// Parsed entries (the engine's own shape), not the raw YAML.
			where: labelsOf(inv.where),
			ignore: labelsOf(inv.ignore),
			when: raw.when ? describeCondition(raw.when) : [],
			dedupeBy: labelsOf(inv.dedupeBy),
			report: inv.report?.message ?? (typeof inv.report === "string" ? inv.report : null),
			infer: (inv.infer ?? []).map((e) => summarizeRule(e, raw)),

			findingCount: counts.get(inv.id) ?? 0,
		};
	});
};

module.exports = {
	buildInvariants,
	describeCondition,
};
