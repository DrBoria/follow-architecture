import React from "react";
import styled from "styled-components";
import { Badge, Subtle } from "./ui";
import { nodeLabel } from "../utils/format";

const Row = styled.div`
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	gap: 10px;
	align-items: center;
`;

const Card = styled.div`
	border: 1px solid ${(p) => p.$color}55;
	background: ${(p) => p.$color}12;
	border-radius: ${(p) => p.theme.radius.sm};
	padding: 9px 11px;
	min-width: 0;
`;

const CardTitle = styled.div`
	font-size: 10.5px;
	text-transform: uppercase;
	letter-spacing: 0.7px;
	color: ${(p) => p.theme.color.textFaint};
	margin-bottom: 3px;
`;

const Node = styled.div`
	font-family: ${(p) => p.theme.font.mono};
	font-size: 12.5px;
	color: ${(p) => p.$color};
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

const Path = styled.div`
	font-family: ${(p) => p.theme.font.mono};
	font-size: 11px;
	color: ${(p) => p.theme.color.textFaint};
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;

const Arrow = styled.div`
	font-size: 18px;
	color: ${(p) => p.$color};
	white-space: nowrap;
`;

// "Structure before → structure after" for one finding.
export const BeforeAfter = ({ plan, file }) => {
	if (!plan) return null;
	// A plan is not always complete: a cross-cutting finding has neither a
	// destination nor a before/after pair, and some plans name a node without the
	// paths it covers. Reading `paths[0]` unguarded crashed the whole screen on
	// exactly those findings.
	const { before, after, target } = plan;
	const allowedImporters = plan.allowedImporters ?? [];
	const allowedGlobs = plan.allowedGlobs ?? [];

	const ownerCard = (
		<Card $color="#ff6b6b">
			<CardTitle>now</CardTitle>
			<Node $color="#ff8f8f">{before?.paths?.[0] ? nodeLabel({ paths: before.paths }, 2) : before?.node ?? "unassigned"}</Node>
			<Path>{before?.paths?.[0] ?? file}</Path>
		</Card>
	);

	// Boundary hit: the fix is not a move, it is "this file may not import that
	// node". Show the crossing, then who IS allowed.
	if (target) {
		return (
			<div style={{ display: "grid", gap: 8 }}>
				<Row>
					{ownerCard}
					<Arrow $color="#ff6b6b">──✕──▶</Arrow>
					<Card $color="#fbbf24">
						<CardTitle>imports this node</CardTitle>
						<Node $color="#fbbf24">{nodeLabel({ paths: target.paths ?? [] }, 2)}</Node>
						<Path>{target.paths?.[0] ?? "…"}</Path>
					</Card>
				</Row>
				<Card $color="#4ade80">
					<CardTitle>allowed importers of {nodeLabel({ paths: target.paths }, 2) || target.node}</CardTitle>
					<div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
						{allowedImporters.length ? (
							allowedImporters.map((n) => (
								<Badge key={n} color="#4ade80">
									{n}
								</Badge>
							))
						) : (
							<Badge color="#6b7788">nobody</Badge>
						)}
						{allowedGlobs.slice(0, 2).map((g) => (
							<Badge key={g} color="#56c8a8">
								{g}
							</Badge>
						))}
					</div>
				</Card>
			</div>
		);
	}

	return (
		<div style={{ display: "grid", gap: 8 }}>
			<Row>
				{ownerCard}
				<Arrow $color={after ? "#4ade80" : "#6b7788"}>{after ? "──▶" : "──"}</Arrow>
				{after ? (
					<Card $color="#4ade80">
						<CardTitle>should live here</CardTitle>
						<Node $color="#8ce6a8">{nodeLabel({ paths: after.paths }, 2) || after.node}</Node>
						<Path>{after.paths?.[0] ?? after.node ?? "…"}</Path>
					</Card>
				) : (
					<Card $color="#6b7788">
						<CardTitle>destination</CardTitle>
						<Node $color="#95a1b3">in place</Node>
						<Path>cross-cutting invariant — rewrite, not a move</Path>
					</Card>
				)}
			</Row>
		</div>
	);
};
