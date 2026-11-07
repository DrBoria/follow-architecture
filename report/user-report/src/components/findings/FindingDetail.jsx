import React, { useMemo } from "react";
import styled from "styled-components";
import { AccessGraph } from "../AccessGraph";
import { BeforeAfter } from "../BeforeAfter";
import { Badge, Panel, PanelHead, Subtle, Title } from "../ui";
import { categoryColor } from "../../theme";
import { nodeLabel } from "../../utils/format";
import { buildProblemView } from "../../graph";

const Block = styled.div`
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

// The selected finding: what fired, the rule behind it, the repairs — and the
// picture of the place. NOTHING here decides what the picture means: the
// taxonomy (`report/errorTypes/`) decided the kind of problem and the wording,
// and `graph/decision.js` picked the representation for that kind. This file is
// markup only.
// The repairs are arrows too, so they need their own colours; the violation
// keeps the shared kind palette.
const repairColors = { move: "#6ea8fe", split: "#fbbf24", route: "#4ade80", remove: "#ff8f8f", delete: "#ff8f8f", rules: "#8b98ab" };

export const FindingDetail = ({ current, rule, nodes, graphKinds, showGraph, onToggleGraph }) => {
	const view = useMemo(
		() => buildProblemView({ finding: current, story: current?.story, nodes }),
		[current, nodes],
	);
	if (!current) return null;
	const fixOptions = current.fixOptions ?? [];

	return (
		<div data-testid="finding-detail" style={{ display: "grid", gap: 16 }}>
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
				<div style={{ marginTop: 12 }}>
					<BeforeAfter plan={current.plan} file={current.file} />
				</div>
				{rule ? (
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
				) : null}
				{fixOptions.length ? (
					<Block $bg="rgba(74,222,128,0.06)">
						<Label>how to fix — {fixOptions.length} option{fixOptions.length === 1 ? "" : "s"}</Label>
						<ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
							{fixOptions.map((option, i) => (
								<li key={i}>{option.text}</li>
							))}
						</ol>
					</Block>
				) : null}
			</Panel>

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
				{showGraph ? (
					<>
						{view.nodes.length ? (
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
						) : (
							<Subtle>{view.caption}</Subtle>
						)}
					</>
				) : (
					<Subtle>the graph is hidden — click “show graph”.</Subtle>
				)}
			</Panel>
		</div>
	);
};
