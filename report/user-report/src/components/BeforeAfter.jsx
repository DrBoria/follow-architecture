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
//
// A RELATION finding has no "after": the file stays where it is and only the
// edge is wrong, so `plan.relation` is rendered as a crossed-out arrow to the
// piece that was touched. Rendering the engine's move hint as "should live
// here" sent readers to move a file that was perfectly placed.
export const BeforeAfter = ({ plan, file }) => {
	if (!plan) return null;
	// A plan is not always complete: a cross-cutting finding has neither a
	// destination nor a before/after pair, and some plans name a node without the
	// paths it covers. Reading `paths[0]` unguarded crashed the whole screen on
	// exactly those findings.
	const { before, after, target } = plan;
	const relation = plan.relation ?? null;
	const allowedImporters = plan.allowedImporters ?? [];
	const allowedGlobs = plan.allowedGlobs ?? [];

	const ownerCard = (
		<Card $color="#ff6b6b">
			<CardTitle>now</CardTitle>
			<Node $color="#ff8f8f">{before?.paths?.[0] ? nodeLabel({ paths: before.paths }, 2) : before?.node ?? "unassigned"}</Node>
			<Path>{before?.paths?.[0] ?? file}</Path>
		</Card>
	);

	// A refused relation: the owner stays, the arrow is crossed out, and the piece
	// it reached is named as a FILE (that is what the engine saw).
	if (relation) {
		return (
			<div style={{ display: "grid", gap: 8 }}>
				<Row>
					{ownerCard}
					<Arrow $color="#ff6b6b">──✕──▶</Arrow>
					<Card $color="#fbbf24">
						<CardTitle>{relation.kind} of this piece — not allowed</CardTitle>
						<Node $color="#fbbf24">{relation.paths?.[0] ?? relation.node ?? "…"}</Node>
						<Path>{relation.node ? `belongs to \`${relation.node}\`` : "no declared node"}</Path>
					</Card>
				</Row>
			</div>
		);
	}

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
				) : plan.remove ? (
					// The repair says "delete", so the card says "deleted". A card reading
					// "no destination named — nothing moves" next to a sentence that deletes
					// the code is the picture contradicting the words.
					<Card $color="#ff6b6b">
						<CardTitle>after the fix</CardTitle>
						<Node $color="#ff8f8f">✕ removed</Node>
						<Path>{plan.repair?.text ?? "this code goes away"}</Path>
					</Card>
				) : (
					<Card $color="#6b7788">
						<CardTitle>destination</CardTitle>
						<Node $color="#95a1b3">none named</Node>
						<Path>the repair names no place — the code itself has to change</Path>
					</Card>
				)}
			</Row>
		</div>
	);
};
