"use strict";

// The finding panel's two halves: the statement (what fired, the rule, the
// repairs) and the picture (the problem view, drawn or hidden). Split from the
// detail so each reads as one panel, not a wall of conditionals.

import React from "react";
import styled from "styled-components";
import { AccessGraph } from "../AccessGraph";
import { BeforeAfter } from "../BeforeAfter";
import { Badge, Panel, PanelHead, Subtle, Title } from "../ui";
import { categoryColor } from "../../theme";
import { nodeLabel } from "../../utils/format";
import type { ProblemView } from "../../graph/decision";
import type { EnrichedFinding, FindingHighlight } from "../../../../../entities/enriched-finding";
import type { InvariantSummary } from "../../../../../entities/overview-summaries";

const Block = styled.div<{ $bg?: string }>`
	margin-top: 10px;
	padding: 10px 12px;
	border-radius: ${(p) => p.theme.radius.sm};
	background: ${(p) => p.$bg ?? "rgba(255,255,255,0.025)"};
	font-size: 13px;
	line-height: 1.6;
`;

const Label = styled.div`
	font-size: 10.5px;
	text-transform: uppercase;
	letter-spacing: 0.7px;
	color: ${(p) => p.theme.color.textFaint};
	margin-bottom: 4px;
`;

// The repairs are arrows too, so they need their own colours; the violation
// keeps the shared kind palette.
const repairColors: Record<string, string> = { move: "#6ea8fe", split: "#fbbf24", route: "#4ade80", remove: "#ff8f8f", delete: "#ff8f8f", rules: "#8b98ab" };

// The rule as declared: its first infer block's condition lines, as badges.
const RuleBlock = ({ rule }: { rule: InvariantSummary }): React.JSX.Element => (
	<Block>
		<Label>rule as declared — {rule.id}</Label>
		<div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
			{(rule.infer[0]?.conditions ?? []).map((c, i) => (
				<Badge key={i} color="#56c8a8">
					{c}
				</Badge>
			))}
		</div>
	</Block>
);

// The repairs the finding offers, as a numbered list.
const FixBlock = ({ options }: { options: readonly { text: string }[] }): React.JSX.Element => (
	<Block $bg="rgba(74,222,128,0.06)">
		<Label>how to fix — {options.length} option{options.length === 1 ? "" : "s"}</Label>
		<ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
			{options.map((option, i) => (
				<li key={i}>{option.text}</li>
			))}
		</ol>
	</Block>
);

// The exact span a finding named inside a value, highlighted: the malformed
// `calc(…)` or the offending token, not a whole-line tint. The text is the raw
// value the engine judged; `start`/`end` are its offsets.
const ValueHighlight = ({ highlight }: { highlight: FindingHighlight }): React.JSX.Element => {
	const before = highlight.text.slice(0, highlight.start);
	const hit = highlight.text.slice(highlight.start, highlight.end);
	const after = highlight.text.slice(highlight.end);

	return (
		<div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "#0a0d13", border: "1px solid rgba(255,107,107,0.35)", fontFamily: "ui-monospace, monospace", fontSize: 12.5, color: "#9aa7b8" }}>
			{before}
			<mark
				data-fa-highlight={highlight.kind}
				title={`CSS grammar: ${highlight.kind}`}
				style={{ background: "rgba(255,107,107,0.28)", color: "#ffb3b3", borderRadius: 3, padding: "0 2px" }}
			>
				{hit}
			</mark>
			{after}
		</div>
	);
};

// The statement panel: title, badges, message, before/after, rule, repairs.
const StatementPanel = ({ current, rule }: { current: EnrichedFinding; rule: InvariantSummary | null }): React.JSX.Element => {
	const fixOptions = current.fixOptions ?? [];
	return (
		<Panel>
			<PanelHead>
				<Title>{current.title}</Title>
				<Badge color={categoryColor(current.category)}>{current.category}</Badge>
				{current.ownerPaths?.length ? <Badge color="#6ea8fe">{nodeLabel({ paths: current.ownerPaths }, 2)}</Badge> : null}
				{current.nodeRoles?.length ? <Badge color="#8b98ab">holds: {current.nodeRoles.join(" / ")}</Badge> : null}
				{/* The rule by ID — the name a reader can search for in the config. */}
				{current.invariant ? <Badge color="#c8a2ff">{current.invariant}</Badge> : null}
			</PanelHead>
			<div style={{ fontSize: 13, color: "#c3ccd9" }}>{current.message}</div>
			{current.highlight ? <ValueHighlight highlight={current.highlight} /> : null}
			<div style={{ marginTop: 12 }}>
				<BeforeAfter plan={current.plan} file={current.file} />
			</div>
			{rule ? <RuleBlock rule={rule} /> : null}
			{fixOptions.length ? <FixBlock options={fixOptions} /> : null}
		</Panel>
	);
};

// The picture itself: the problem view's boxes and arrows, with its caption.
const Picture = ({ view, current, graphKinds }: { view: ProblemView; current: EnrichedFinding; graphKinds: Record<string, string> }): React.JSX.Element => {
	if (!view.nodes.length) return <Subtle>{view.caption}</Subtle>;
	return (
		<>
			<AccessGraph
				nodes={view.nodes}
				edges={view.edges}
				marks={view.marks}
				keep={view.keep}
				kindColors={{ ...graphKinds, ...repairColors }}
				focus={current.ownerNode ?? null}
				height={view.nodes.length > 2 ? 420 : 240}
				growOnWide
			/>
			<Subtle style={{ display: "block", marginTop: 8, color: "#ff8a8a" }}>{view.caption}</Subtle>
		</>
	);
};

// The picture panel: the view's title, the show/hide control, and the drawing.
const PicturePanel = ({ view, current, graphKinds, showGraph, onToggleGraph }: { view: ProblemView; current: EnrichedFinding; graphKinds: Record<string, string>; showGraph: boolean; onToggleGraph: () => void }): React.JSX.Element => (
	<Panel>
		<PanelHead>
			<Title>{view.title}</Title>
			<Subtle
				as="button"
				onClick={onToggleGraph}
				style={{ cursor: "pointer", background: "none", border: "none", color: "#6ea8fe", font: "inherit", padding: 0 }}
			>
				{showGraph ? "hide graph" : "show graph"}
			</Subtle>
		</PanelHead>
		{showGraph ? <Picture view={view} current={current} graphKinds={graphKinds} /> : <Subtle>the graph is hidden — click “show graph”.</Subtle>}
	</Panel>
);

export { StatementPanel, PicturePanel };
