"use strict";

// Code-role summaries: the role's identity, its infer as written, its report
// unwrapped to the two sentence fields the card shows, what may be DONE with
// code of this role, where it may live, and the real examples from this repo.

import { labelOf } from "../../../entities/location";
import { keyedDefs } from "../../../utils/keyed";
import { fieldOf, isObj, type FieldValue } from "../../../utils/field";
import { stringField } from "../../../utils/read-field";
import { readWhen } from "../../../utils/read-when";
import { collectExamples } from "./role-examples";
import type { Arch, RawRole, RoleDef } from "../../../entities/architecture";
import type { NodeSummary, RoleSummary, RoleHome, RoleAction } from "../../../entities/overview-summaries";
import type { OverviewInput } from "../../../entities/overview";

// The codeRoles section as written: a list of `{ slug, … }` or a map keyed by
// slug — the ONE keyed-section reader answers both.
const rawRoles = (raw: Arch["raw"]["codeRoles"]): Map<string, RawRole> => {
	const defs = keyedDefs(raw);
	const out = new Map<string, RawRole>();
	for (const def of defs) {
		if (!isObj(def)) continue;
		const slug = stringField(def, "slug");
		if (slug) out.set(slug, def);
	}
	return out;
};

// The report as written: a sentence, or `{ description | message, fix }`.
const messageOf = (report: FieldValue): string | null =>
	readWhen(report, isObj, (r) => stringField(r, "description", stringField(r, "message")) || null, typeof report === "string" ? report : null);

const reportOf = (rawDef: FieldValue): RoleSummary["report"] => {
	const report = fieldOf(rawDef, "report");
	const fix = fieldOf(report, "fix");
	const fixText = typeof fix === "string" ? fix : stringField(fix, "message") || null;
	return { message: messageOf(report), fix: fixText };
};

// What may be DONE with code of this role, and by whom. A custom action name
// (`emit: { of: call }`) states which fact class it is checked against.
const actionsOf = (def: RoleDef): RoleAction[] =>
	Object.entries(def.actions ?? {}).map(([kind, action]) => ({
		kind,
		of: action.of ?? null,
		from: (action.where ?? []).map(labelOf),
		scopeAccess: action.scopeAccess ?? [],
	}));

// Where code of this role may be declared — ONE row per node: a folder that
// declares the role twice is still one place.
const addLabel = (home: RoleHome, template: string): void => {
	if (template && !home.labels.includes(template)) home.labels.push(template);
};

const homesOf = (slug: string, arch: Arch, nodeBySlug: Map<string, NodeSummary>): RoleHome[] => {
	const homes: RoleHome[] = [];
	for (const h of arch.nodes.roleHomes[slug] ?? []) {
		const seen = homes.find((x) => x.slug === h.node);
		if (seen) {
			addLabel(seen, h.template);
			continue;
		}
		const node = h.node ? nodeBySlug.get(h.node) : undefined;
		homes.push({ slug: h.node ?? "", paths: node?.paths ?? [], label: h.template, labels: h.template ? [h.template] : [] });
	}
	return homes;
};

const roleSummary = (slug: string, def: RoleDef, ask: { arch: Arch; raw: Map<string, RawRole>; examples: ReturnType<typeof collectExamples>; nodeBySlug: Map<string, NodeSummary> }): RoleSummary => {
	const rawDef = ask.raw.get(slug) ?? {};
	const bucket = ask.examples.get(slug) ?? { list: [], overflow: 0 };
	return {
		slug,
		name: def.name ?? slug,
		infer: fieldOf(rawDef, "infer") ?? def.infer ?? null,
		report: reportOf(rawDef),
		actions: actionsOf(def),
		homes: homesOf(slug, ask.arch, ask.nodeBySlug),
		examples: bucket.list,
		exampleCount: bucket.list.length + bucket.overflow,
	};
};

type RolesAsk = Pick<OverviewInput, "arch" | "files" | "repoRoot" | "repoFiles" | "project"> & { nodes?: NodeSummary[] };

const buildRoles = (ask: RolesAsk): RoleSummary[] => {
	const { arch, nodes } = ask;
	const raw = rawRoles(arch.raw?.codeRoles);
	const examples = collectExamples(ask);
	const nodeBySlug = new Map((nodes ?? []).map((n) => [n.slug, n]));
	return Object.entries(arch.codeRoles ?? {}).map(([slug, def]) => roleSummary(slug, def, { arch, raw, examples, nodeBySlug }));
};

export { buildRoles };
