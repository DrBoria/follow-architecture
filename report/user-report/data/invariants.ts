"use strict";

// The entry labeller is the engine's — a `where` reads the same in the report as
// it does in the rule.
import { labelOf } from "../../../entities/location";
import { describeQuery } from "../shared/describe";
import { isObj, fieldOf, type FieldValue } from "../../../utils/field";
import { stringField } from "../../../utils/read-field";
import type { Arch, Invariant, ReportValue, WhereEntry } from "../../../entities/architecture";
import type { Finding } from "../../../entities/findings";
import type { InvariantSummary, InvariantRule } from "../../../entities/overview-summaries";

// Invariant summaries: the YAML `infer` block is a nested query object.
// The overview turns each one into a short, readable condition so a reader can
// tell what the rule actually demands. `where` and `ignore` are labelled by the
// same describer the engine uses — never `String(entry)`.

const IGNORED = ["report", "message", "fix", "key", "line"];

const describeCondition = (query: FieldValue): string[] => describeQuery(query, { ignore: IGNORED, setValue: "" });

// The report text a rule states: a bare string, or `{ description | message }`.
const reportMessage = (report: ReportValue | FieldValue): string | null => {
	if (typeof report === "string") return report;
	if (!isObj(report)) return null;
	const desc = report.description;
	const msg = report.message;
	return (typeof desc === "string" ? desc : "") || (typeof msg === "string" ? msg : "") || null;
};

const summarizeRule = (entry: FieldValue, inv: Invariant): InvariantRule => {
	const report: ReportValue | FieldValue = isObj(entry) ? fieldOf(entry, "report") : inv.report;
	return {
		conditions: describeCondition(entry ?? {}),
		message: reportMessage(report),
		fix: (isObj(report) ? report.fix : null) ?? null,
	};
};

const labelsOf = (entries: readonly WhereEntry[] | null | undefined): string[] => (entries ?? []).map(labelOf);

// The raw invariant by id, for the `when` block the built model does not carry.
const rawWhen = (raw: FieldValue): string[] => {
	const when = isObj(raw) ? fieldOf(raw, "when") : null;
	return when ? describeCondition(when) : [];
};

const invariantSummary = (inv: Invariant, raw: FieldValue, counts: Map<string, number>): InvariantSummary => ({
	id: inv.id,
	where: labelsOf(inv.where),
	ignore: labelsOf(inv.ignore),
	when: rawWhen(raw),
	dedupeBy: labelsOf(inv.dedupeBy),
	report: reportMessage(inv.report),
	infer: (inv.infer ?? []).map((e) => summarizeRule(e, inv)),
	findingCount: counts.get(inv.id) ?? 0,
});

const buildInvariants = (arch: Arch, findings: readonly Finding[]): InvariantSummary[] => {
	const rawList = arch.raw.invariants ?? [];
	const rawById = new Map(rawList.map((i) => [String(isObj(i) ? fieldOf(i, "id") : ""), i]));
	const counts = new Map<string, number>();
	for (const f of findings) {
		const id = /^invariant:([^:]+)/.exec(stringField(f, "dedupeKey") || stringField(f, "key"))?.[1];
		if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
	}

	return arch.invariants.map((inv) => invariantSummary(inv, rawById.get(inv.id) ?? null, counts));
};

export { buildInvariants, describeCondition };
