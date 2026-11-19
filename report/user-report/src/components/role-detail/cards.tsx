"use strict";

// The role dashboard's cards: detection (the infer YAML + condition badges),
// the real example, the outgoing reach, the incoming actions, and the report
// template filled from the example. Each is one named card.

import React from "react";
import { Badge, Subtle } from "../ui";
import { CodePanel } from "../code-preview/CodePanel";
import { inferToYaml } from "../../generate/infer";
import { describeQuery } from "../../utils/describe";
import { groupBy } from "../../../../../utils/group";
import { Section, Label, Arrow, Link, ArrowGlyph, Targets, Chip, Quote, Fix } from "./styles";
import type { RoleSummary, RoleExample, RoleAction } from "../../../../../entities/overview-summaries";
import type { AccessGraph } from "../../../../../entities/access-graph";

const codeOf = (example: RoleExample | null): string | null => (example?.code ? example.code.lines.join("\n") : null);

// What code of THIS role may reach: the graph edges it acts on, one row per
// kind, the targets deduped. A role that declares no actions of its own would
// otherwise look like it does nothing.
type Outgoing = { kind: string; targets: string[] };
const outgoingOf = (role: RoleSummary, graph: AccessGraph | null): Outgoing[] => {
	const acted = (graph?.edges ?? []).filter((e) => (e.actorRoles ?? []).includes(role.slug) && e.from !== e.to && e.toPath);
	return groupBy(acted, (e) => e.kind).map(([kind, edges]) => ({ kind, targets: [...new Set(edges.map((e) => e.toPath ?? ""))] }));
};

// The report template filled from the example printed right next to it — the
// sentence a reader would actually see, not a raw `{what}` placeholder.
type TemplateValues = Record<string, string>;
const fillOf = (values: TemplateValues) => (text: string | null | undefined): string =>
	String(text ?? "").replace(/\{([A-Za-z]+)\}/g, (whole, key: string) => (values[key] != null && values[key] !== "" ? values[key] : whole));

// The detection card: the infer as YAML, and its condition lines as badges.
const InferCard = ({ role }: { role: RoleSummary }): React.JSX.Element => {
	const conditions = role.infer ? (Array.isArray(role.infer) ? role.infer : [role.infer]).flatMap(describeQuery) : [];
	return (
		<Section $wide>
			<Label>detected by (ts-morph facts)</Label>
			<CodePanel title="architecture.yaml" lang="yaml" code={inferToYaml(role.infer)} max="190px" />
			<div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
				{conditions.map((c, i) => (
					<Badge key={i} color="#b48ef0">
						{c}
					</Badge>
				))}
			</div>
		</Section>
	);
};

// The real example card: the matched lines tinted, or the "no matches" note.
const ExampleCard = ({ example }: { example: RoleExample | null }): React.JSX.Element => {
	if (!example || !codeOf(example)) return <Subtle>no matches in this repository</Subtle>;
	return (
		<Section $wide>
			<Label>real example — matched lines tinted</Label>
			<CodePanel tone="good" title={`${example.name} — ${example.file}:${example.line}`} code={codeOf(example)} max="230px" matched={example.matched ?? null} />
		</Section>
	);
};

// One outgoing-reach row: this role ──kind──▶ its targets.
const OutgoingCard = ({ role, outgoing }: { role: RoleSummary; outgoing: readonly Outgoing[] }): React.JSX.Element => (
	<Section $wide>
		<Label>what this role's code may do</Label>
		{outgoing.map((o) => (
			<Arrow key={o.kind}>
				<Chip $c="#f0a35e" title={role.slug}>
					{role.slug}
				</Chip>
				<Link>
					<ArrowGlyph style={{ color: "#6ea8fe" }}>──{o.kind}──▶</ArrowGlyph>
					<Targets>
						<Chip $c="#8b9bb4" title={o.targets.join(" · ")}>
							{o.targets.join(" · ")}
						</Chip>
					</Targets>
				</Link>
			</Arrow>
		))}
	</Section>
);

// One incoming-action row: who ──kind──▶ this role (checked as …, via …).
const ActionRow = ({ role, action }: { role: RoleSummary; action: RoleAction }): React.JSX.Element => {
	const from = action.from.length ? action.from.join(" | ") : "nobody";
	const via = action.scopeAccess?.length ? `via ${action.scopeAccess.map((x) => x.segments.join(".")).join(" · ")}` : null;
	return (
		<Arrow>
			<Chip $c="#8b9bb4" title={from}>
				{from}
			</Chip>
			<Link>
				<ArrowGlyph style={{ color: "#6ea8fe" }}>──{action.kind}──▶</ArrowGlyph>
				<Targets>
					{action.of ? (
						<Chip $c="#8b9bb4" title={`checked as ${action.of}`}>
							checked as {action.of}
						</Chip>
					) : null}
					<Chip $c="#f0a35e" title={role.slug}>
						{role.slug}
					</Chip>
					{via ? (
						<Chip $c="#56c8a8" title={via}>
							{via}
						</Chip>
					) : null}
				</Targets>
			</Link>
		</Arrow>
	);
};

const ActionsCard = ({ role }: { role: RoleSummary }): React.JSX.Element => (
	<Section $wide>
		<Label>what may be done with this role, and by whom</Label>
		{(role.actions ?? []).map((a) => (
			<ActionRow key={a.kind} role={role} action={a} />
		))}
	</Section>
);

// The report card: the message template filled from the example, and its fix.
const ReportCard = ({ role, fill }: { role: RoleSummary; fill: (text: string | null | undefined) => string }): React.JSX.Element => (
	<Section $wide>
		<Label>reported when misfiled</Label>
		<Quote>{fill(role.report?.message)}</Quote>
		{role.report?.fix ? <Fix>→ {fill(role.report.fix)}</Fix> : null}
	</Section>
);

export { codeOf, outgoingOf, fillOf, InferCard, ExampleCard, OutgoingCard, ActionsCard, ReportCard };
export type { Outgoing, TemplateValues };
