"use strict";

// The entry labeller is the engine's — a `where` reads the same in the report as
// it does in the rule.
const { labelOf } = require("../../../entities/location");

// Invariant summaries: the YAML `infer` block is a nested query object.
// The overview turns each one into a short, readable condition
// ("subscriptions.length > 0", "descendants.some.kind = ClassDeclaration") so
// a reader can tell what the rule actually demands. `where` and `ignore` are
// `where` entries (utils/where.js) and are labelled by the same describer the
// engine uses — never `String(entry)`.

// The nested-query walk is shared with the browser describer; the options below
// say only how THIS reader presents it. Report text is shown separately, so it
// is not part of the condition.
const { describeQuery } = require("../shared/describe");

const IGNORED = ["report", "message", "fix", "key", "line"];

const describeCondition = (query) => describeQuery(query, { ignore: IGNORED, setValue: "" });

const summarizeRule = (entry, inv) => {
	const report = entry?.report ?? inv.report ?? null;
	return {
		conditions: describeCondition(entry ?? {}),
			message: report?.description ?? report?.message ?? (typeof report === "string" ? report : null),
		fix: report?.fix ?? null,
	};
};

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
			report: inv.report?.description ?? inv.report?.message ?? (typeof inv.report === "string" ? inv.report : null),
			infer: (inv.infer ?? []).map((e) => summarizeRule(e, raw)),

			findingCount: counts.get(inv.id) ?? 0,
		};
	});
};

module.exports = {
	buildInvariants,
	describeCondition,
};
