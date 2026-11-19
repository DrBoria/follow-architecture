// "Structure before → structure after" for one finding.
//
// A RELATION finding has no "after": the file stays where it is and only the
// edge is wrong, so `plan.relation` is rendered as a crossed-out arrow to the
// piece that was touched. A BOUNDARY hit shows who IS allowed to import the
// target. A placement shows the destination (or the deletion).

import React from "react";
import { Badge } from "./ui";
import { nodeLabel } from "../utils/format";
import { Row, Card, CardTitle, Node, Path, Arrow } from "./before-after/styles";
import { AfterSide } from "./before-after/AfterSide";
import type { Plan, PlanPlace, PlanRelation } from "../../../../entities/enriched-finding";

// The "now" card: where the code sits. A plan may name a node without the paths
// it covers — the label falls back to the node, then to "unassigned".
const OwnerCard = ({ before, file }: { before: PlanPlace | null; file: string }): React.JSX.Element => (
	<Card $color="#ff6b6b">
		<CardTitle>now</CardTitle>
		<Node $color="#ff8f8f">{before?.paths?.[0] ? nodeLabel({ paths: before.paths }, 2) : before?.node ?? "unassigned"}</Node>
		<Path>{before?.paths?.[0] ?? file}</Path>
	</Card>
);

// A refused relation: the owner stays, the arrow is crossed out, and the piece
// it reached is named as a FILE (that is what the engine saw).
const RelationView = ({ before, file, relation }: { before: PlanPlace | null; file: string; relation: PlanRelation }): React.JSX.Element => (
	<div style={{ display: "grid", gap: 8 }}>
		<Row>
			<OwnerCard before={before} file={file} />
			<Arrow $color="#ff6b6b">──✕──▶</Arrow>
			<Card $color="#fbbf24">
				<CardTitle>{relation.kind} of this piece — not allowed</CardTitle>
				<Node $color="#fbbf24">{relation.paths?.[0] ?? relation.node ?? "…"}</Node>
				<Path>{relation.node ? `belongs to \`${relation.node}\`` : "no declared node"}</Path>
			</Card>
		</Row>
	</div>
);

// Who IS allowed to import the target: the engine's own verdict, as badges.
const AllowedImporters = ({ importers, globs }: { importers: readonly string[]; globs: readonly string[] }): React.JSX.Element => (
	<div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
		{importers.length ? (
			importers.map((n) => <Badge key={n} color="#4ade80">{n}</Badge>)
		) : (
			<Badge color="#6b7788">nobody</Badge>
		)}
		{globs.slice(0, 2).map((g) => <Badge key={g} color="#56c8a8">{g}</Badge>)}
	</div>
);

// Boundary hit: the fix is not a move, it is "this file may not import that
// node". Show the crossing, then who IS allowed.
const BoundaryView = ({ before, file, plan }: { before: PlanPlace | null; file: string; plan: Plan }): React.JSX.Element => {
	const target = plan.target;
	if (!target) return <></>;
	return (
		<div style={{ display: "grid", gap: 8 }}>
			<Row>
				<OwnerCard before={before} file={file} />
				<Arrow $color="#ff6b6b">──✕──▶</Arrow>
				<Card $color="#fbbf24">
					<CardTitle>imports this node</CardTitle>
					<Node $color="#fbbf24">{nodeLabel({ paths: target.paths ?? [] }, 2)}</Node>
					<Path>{target.paths?.[0] ?? "…"}</Path>
				</Card>
			</Row>
			<Card $color="#4ade80">
				<CardTitle>allowed importers of {nodeLabel({ paths: target.paths }, 2) || target.node}</CardTitle>
				<AllowedImporters importers={plan.allowedImporters ?? []} globs={plan.allowedGlobs ?? []} />
			</Card>
		</div>
	);
};

const BeforeAfter = ({ plan, file }: { plan: Plan | null | undefined; file: string }): React.JSX.Element | null => {
	if (!plan) return null;
	const { before, after, target } = plan;
	const relation = plan.relation ?? null;
	if (relation) return <RelationView before={before} file={file} relation={relation} />;
	if (target) return <BoundaryView before={before} file={file} plan={plan} />;
	return (
		<div style={{ display: "grid", gap: 8 }}>
			<Row>
				<OwnerCard before={before} file={file} />
				<Arrow $color={after ? "#4ade80" : "#6b7788"}>{after ? "──▶" : "──"}</Arrow>
				<AfterSide plan={plan} />
			</Row>
		</div>
	);
};

export { BeforeAfter };
