"use strict";

// The role screen's panes: the role list (with the "may live in" homes), the
// graph view (kind filters, the canvas, the no-edge notes), and the dashboard
// head. Split from the screen so each pane is one named block.

import React from "react";
import { Badge, Panel, PanelHead, SearchBox, Subtle, Title } from "../../components/ui";
import { AccessGraph } from "../../components/AccessGraph";
import { nodeLabel, plural, matchesText } from "../../utils/format";
import { RoleRow, Scroll, Bar, KindButton } from "./styles";
import type { RoleSummary } from "../../../../../entities/overview-summaries";
import type { RoleNode, Mention, AccessEdge } from "../../../../../entities/access-graph";

// The role list: search, and one row per role with its example count.
const RoleListPane = ({ roles, role, query, onQuery, onRole }: { roles: readonly RoleSummary[]; role: RoleSummary | null; query: string; onQuery: (q: string) => void; onRole: (slug: string) => void }): React.JSX.Element => {
	const listed = roles.filter((r) => matchesText(`${r.slug} ${r.name}`, query));
	return (
		<Panel>
			<PanelHead>
				<Title>Code roles</Title>
			</PanelHead>
			<SearchBox value={query} onChange={onQuery} placeholder="Filter roles…" />
			<Scroll style={{ marginTop: 8 }}>
				{listed.map((r) => (
					<RoleRow key={r.slug} $active={role?.slug === r.slug} onClick={() => onRole(r.slug)}>
						<div style={{ display: "flex", alignItems: "center", gap: 7 }}>
							<span style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</span>
							<Badge color="#b48ef0">{r.slug}</Badge>
							<span style={{ marginLeft: "auto", fontSize: 11, color: "#6b7788" }}>{r.exampleCount} in repo</span>
						</div>
					</RoleRow>
				))}
			</Scroll>
		</Panel>
	);
};

// Where the selected role may be declared: one line per home, the path shown
// only when it differs from the label (a folder whose name IS its path would
// print the same string twice).
const HomesPane = ({ role }: { role: RoleSummary }): React.JSX.Element => (
	<Panel>
		<PanelHead>
			<Title>May Live In</Title>
		</PanelHead>
		{role.homes.map((h) => {
			const label = nodeLabel(h, 2);
			const path = h.paths?.join(" | ") ?? "";
			return (
				<div key={h.slug} style={{ fontSize: 12.5, fontFamily: "monospace", overflowWrap: "anywhere", marginBottom: 4 }}>
					<span style={{ color: "#6ea8fe" }}>{label || path}</span> {path && path !== label ? <span style={{ color: "#6b7788" }}>{path}</span> : null}
				</div>
			);
		})}
	</Panel>
);

// The note when a role has no edges: no action names it, or it has no `where`.
// The rules that name it as an actor are listed so its screen is not empty.
const NoEdgesNote = ({ role, mentions, colors }: { role: RoleSummary; mentions: readonly Mention[]; colors: Record<string, string> }): React.JSX.Element => (
	<div style={{ marginBottom: 12, fontSize: 13, color: "#c3ccd9" }}>
		{role.homes?.length ? (
			<>No action names this role as a source or a target — nothing may reach it and it reaches nothing.</>
		) : (
			<>
				<span style={{ color: "#fbbf24" }}>
					This role has no <code>where</code>: it may live in any folder, so it has no single box to draw.
				</span>{" "}
				Add <code>{"where: [{ node: … }]"}</code> to pin it down.
			</>
		)}
		{mentions.length ? (
			<div style={{ marginTop: 10 }}>
				<div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7, color: "#6b7788", marginBottom: 4 }}>
					rules that name this role as the actor
				</div>
				{mentions.map((m, i) => (
					<div key={i} style={{ fontFamily: "monospace", fontSize: 12, color: "#c3ccd9" }}>
						<code>{m.targetRole}</code> <span style={{ color: colors[m.kind] ?? "#7d8899" }}>{m.kind}</span> — {m.targetPaths.join(" | ")}
					</div>
				))}
			</div>
		) : null}
	</div>
);

// The kind filter buttons: "all" plus one per action the role declares.
const KindBar = ({ kinds, kind, counts, total, colors, onKind }: { kinds: readonly string[]; kind: string; counts: Map<string, number>; total: number; colors: Record<string, string>; onKind: (k: string) => void }): React.JSX.Element => (
	<Bar style={kinds.length ? undefined : { display: "none" }}>
		<KindButton $active={kind === "all"} $color="#d7dee8" onClick={() => onKind("all")}>
			all {total}
		</KindButton>
		{kinds.map((k) => (
			<KindButton key={k} $active={kind === k} $color={colors[k]} onClick={() => onKind(k)}>
				{k} {counts.get(k) ?? 0}
			</KindButton>
		))}
	</Bar>
);

// The graph pane: the counts, the show-all toggle, the filters, the canvas, and
// the direction note. `unplaceable` counts the rules that name no folder.
type GraphPaneAsk = {
	role: RoleSummary | null;
	roleEdges: readonly AccessEdge[];
	edges: AccessEdge[];
	roleGraphNodes: RoleNode[];
	kinds: string[];
	kind: string;
	counts: Map<string, number>;
	colors: Record<string, string>;
	focus: string | null;
	showAll: boolean;
	mentions: Mention[];
	unplaceableCount: number;
	onKind: (k: string) => void;
	onFocus: (slug: string | null) => void;
	onShowAll: () => void;
};

const GraphPane = (ask: GraphPaneAsk): React.JSX.Element => {
	const { role, roleEdges, edges, roleGraphNodes, kinds, kind, counts, colors, focus, showAll, mentions, unplaceableCount, onKind, onFocus, onShowAll } = ask;
	return (
		<Panel style={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
			<PanelHead>
				<Title>Graph View</Title>
				<Badge color="#8b9bb4">
					{plural(new Set(edges.flatMap((e) => [e.from, e.to])).size, "role")} · {plural(edges.length, "rule")}
				</Badge>
				<KindButton $active={showAll} $color="#6b7788" onClick={onShowAll} style={{ marginLeft: "auto" }}>
					{showAll ? "Only connected" : "Show all roles"}
				</KindButton>
			</PanelHead>
			{role && !roleEdges.length ? <NoEdgesNote role={role} mentions={mentions} colors={colors} /> : null}
			<KindBar kinds={kinds} kind={kind} counts={counts} total={roleEdges.length} colors={colors} onKind={onKind} />
			<AccessGraph nodes={roleGraphNodes} edges={edges} kindColors={colors} focus={focus} onFocus={onFocus} showAll={showAll} height={280} growOnWide />
			<Subtle style={{ display: "block", marginTop: 8 }}>
				{"an arrow points from the code that is imported or used INTO the code that imports or uses it: “left ──import──▶ right” = right imports left — hover for the exact sentence"}
			</Subtle>
			{unplaceableCount ? (
				<Subtle style={{ display: "block", marginTop: 10 }}>
					{unplaceableCount} rule(s) cannot be drawn as a folder arrow — the rule names a glob or a filter, not a folder.
				</Subtle>
			) : null}
		</Panel>
	);
};

export { RoleListPane, HomesPane, GraphPane };
export type { GraphPaneAsk };
