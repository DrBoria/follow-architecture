// The role screen: pick a code role on the left, see ITS boundary on the right.
// The canvas is the ROLE graph — one box per codeRole, with the paths it may be
// met at listed inside — so "what may be done with this role, and by whom" is
// read as the rule itself, not a projection onto folders. The panes live in
// `graph-screen/`; this screen is the state and the navigation.

import React, { useMemo, useState } from "react";
import { Badge, Title } from "../components/ui";
import { RoleDetail } from "../components/RoleDetail";
import { kindColors } from "../theme";
import { nodeLabel, plural } from "../utils/format";
import { edgeKinds, edgeKindCounts, edgesOfKind } from "../utils/edges";
import { navigate } from "../utils/router";
import { Layout, Cell, Dash, DashHead } from "./graph-screen/styles";
import { RoleListPane, HomesPane, GraphPane } from "./graph-screen/panes";
import type { ScreenProps } from "./contract";
import type { RoleSummary } from "../../../../entities/overview-summaries";
import type { AccessEdge } from "../../../../entities/access-graph";

// The selection the URL names: the role (or the first), the kind filter, the focus.
const selectionOf = (params: ScreenProps["params"], roles: readonly RoleSummary[]): { roleSlug: string | null; role: RoleSummary | null; kind: string; focus: string | null } => {
	const roleSlug = params.role ?? roles[0]?.slug ?? null;
	return { roleSlug, role: roles.find((r) => r.slug === roleSlug) ?? null, kind: params.kind ?? "all", focus: params.focus ?? null };
};

// The graph route params: only the non-default values travel in the hash.
const graphParams = (ask: { roleSlug: string | null; kind: string; focus: string | null }): Record<string, string> => {
	const params: Record<string, string> = {};
	if (ask.roleSlug) params.role = ask.roleSlug;
	if (ask.kind !== "all") params.kind = ask.kind;
	if (ask.focus) params.focus = ask.focus;
	return params;
};

// A role's boundary is BOTH sides: who may reach its code (`e.to`) and where
// its own code may go (`e.from`). Dropping one side lost real declarations.
const roleEdgesOf = (all: readonly AccessEdge[], role: RoleSummary | null): AccessEdge[] => {
	if (!role) return [...all];
	return all.filter((e) => e.to === role.slug || e.from === role.slug);
};

// The boxes involved in the role's picture (the role plus its arrow ends), or
// every role box when "show all" is on.
const roleNodesOf = (all: readonly { slug: string }[], role: RoleSummary | null, edges: readonly AccessEdge[], showAll: boolean): { slug: string }[] => {
	if (!role || showAll) return [...all];
	const involved = new Set([role.slug, ...edges.flatMap((e) => [e.from, e.to])]);
	return all.filter((n) => involved.has(n.slug));
};

export const GraphScreen = ({ data, params }: ScreenProps): React.JSX.Element => {
	const { nodes, access, roles } = data;
	const [query, setQuery] = useState("");
	const [showAll, setShowAll] = useState(false);

	const { roleSlug, role, kind, focus } = selectionOf(params, roles);

	const colors = useMemo(() => kindColors(access.kinds), [access.kinds]);
	const roleEdges = useMemo(() => roleEdgesOf(access.roleEdges ?? [], role), [access.roleEdges, role]);
	const roleGraphNodes = useMemo(() => roleNodesOf(access.roleNodes ?? [], role, roleEdges, showAll), [access.roleNodes, role, roleEdges, showAll]);
	const edges = useMemo(() => edgesOfKind(roleEdges, kind), [roleEdges, kind]);
	const kinds = useMemo(() => edgeKinds(roleEdges), [roleEdges]);
	const mentions = useMemo(() => (role ? access.mentions?.[role.slug] ?? [] : []), [access.mentions, role]);
	const counts = useMemo(() => edgeKindCounts(roleEdges), [roleEdges]);
	const unplaceableCount = useMemo(() => access.unplaceable.filter((u) => !role || u.targetRole === role.slug).length, [access.unplaceable, role]);

	const setRole = (slug: string): void => navigate("graph", { role: slug });
	const setKind = (k: string): void => navigate("graph", graphParams({ roleSlug, kind: k, focus }));
	const setFocus = (slug: string | null): void => navigate("graph", graphParams({ roleSlug, kind, focus: slug }));

	return (
		<>
			<Layout>
				<Cell>
					<RoleListPane roles={roles} role={role} query={query} onQuery={setQuery} onRole={setRole} />
					{role?.homes?.length ? <HomesPane role={role} /> : null}
				</Cell>
				<Cell>
					<GraphPane
						role={role}
						roleEdges={roleEdges}
						edges={edges}
						roleGraphNodes={roleGraphNodes}
						kinds={kinds}
						kind={kind}
						counts={counts}
						colors={colors}
						focus={focus}
						showAll={showAll}
						mentions={mentions}
						unplaceableCount={unplaceableCount}
						onKind={setKind}
						onFocus={setFocus}
						onShowAll={() => setShowAll((v) => !v)}
					/>
				</Cell>
			</Layout>

			{role ? <RoleDash role={role} nodes={nodes} graph={access} /> : null}
		</>
	);
};

// A DASHBOARD, not a rail: the role's own answers sit under the two main panes
// and flow across the full width.
const RoleDash = ({ role, nodes, graph }: { role: RoleSummary; nodes: ScreenProps["data"]["nodes"]; graph: ScreenProps["data"]["access"] }): React.JSX.Element => (
	<Dash>
		<DashHead>
			<Title>{role.name}</Title>
			<Badge color="#b48ef0">{role.slug}</Badge>
			{role.homes?.length ? <Badge color="#f0a35e">{nodeLabel(role.homes[0], 2)}</Badge> : null}
			{role.exampleCount ? <Badge color="#8b9bb4">{plural(role.exampleCount, "match", "matches")}</Badge> : null}
		</DashHead>
		<RoleDetail role={role} nodes={nodes} graph={graph} />
	</Dash>
);
