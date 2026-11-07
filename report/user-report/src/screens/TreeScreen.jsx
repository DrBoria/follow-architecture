import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Badge, Panel, PanelHead, SearchBox, Subtle, Title } from "../components/ui";
import { TreeNode } from "../components/TreeNode";
import { CodePanel } from "../components/code-preview/CodePanel";
import { AccessGraph } from "../components/AccessGraph";
import { kindColors } from "../theme";
import { navigate } from "../utils/router";

const Layout = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1.1fr) minmax(340px, 1fr);
	gap: 16px;
	align-items: start;
	@media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const TreeBox = styled.div`
	max-height: 640px;
	overflow: auto;
`;

const Section = styled.div`
	display: grid;
	gap: 5px;
	margin-top: 12px;
`;

const Label = styled.div`
	font-size: 10.5px;
	text-transform: uppercase;
	letter-spacing: 0.7px;
	color: ${(p) => p.theme.color.textFaint};
`;

const PathLine = styled.div`
	font-family: ${(p) => p.theme.font.mono};
	font-size: 11.5px;
	color: ${(p) => p.theme.color.textDim};
`;

// A finding in this folder: the file is the LINK (it opens the finding), the
// title is one short line. Colour marks the category, not the whole paragraph
// — long red text is unreadable.
const FindingRow = styled.button`
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: 8px;
	align-items: baseline;
	width: 100%;
	text-align: left;
	background: transparent;
	border: none;
	border-left: 2px solid ${(p) => p.$color};
	padding: 3px 0 3px 8px;
	cursor: pointer;
	color: ${(p) => p.theme.color.text};
	&:hover { background: rgba(255, 255, 255, 0.04); }
`;

const FileLink = styled.span`
	font-family: ${(p) => p.theme.font.mono};
	font-size: 11px;
	color: ${(p) => p.theme.color.textDim};
	white-space: nowrap;
`;

// The same colour-coded action filters as the Code Roles screen: the panel draws
// one folder's arrows, and "import" alone is often the only one worth looking at.
const FilterBar = styled.div`
	display: flex;
	gap: 6px;
	align-items: center;
	flex-wrap: wrap;
	margin-bottom: 8px;
`;

const KindButton = styled.button`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 3px 10px;
	border-radius: 999px;
	font-size: 11.5px;
	font-weight: 600;
	cursor: pointer;
	color: ${(p) => p.$color ?? p.theme.color.text};
	background: ${(p) => (p.$active ? `${p.$color}2e` : `${p.$color}14`)};
	border: 1px solid ${(p) => (p.$active ? `${p.$color}cc` : `${p.$color}55`)};
	&:hover { border-color: ${(p) => p.$color}; background: ${(p) => `${p.$color}24`}; }
`;

export const TreeScreen = ({ data, params }) => {
	const { nodes, findings, roles, access } = data;
	const colors = useMemo(() => kindColors(access.kinds), [access.kinds]);

	// Which kinds each folder takes part in — the same colours the arrows use.
	const kindFlags = useMemo(() => {
		const map = {};
		for (const e of access.edges) {
			for (const slug of [e.from, e.to]) {
				if (!map[slug]) map[slug] = [];
				if (!map[slug].includes(e.kind)) map[slug].push(e.kind);
			}
		}
		return map;
	}, [access.edges]);

	const childrenByParent = useMemo(() => {
		const map = new Map();
		for (const n of nodes) {
			for (const p of n.parents) {
				if (!map.has(p)) map.set(p, []);
				map.get(p).push(n);
			}
		}
		return map;
	}, [nodes]);

	const roots = useMemo(() => nodes.filter((n) => !n.parents.length), [nodes]);

	// Findings per folder, so a row says how much is wrong with it before it is
	// opened.
	const findingCounts = useMemo(() => {
		const map = {};
		for (const f of findings) {
			if (!f.ownerNode) continue;
			map[f.ownerNode] = (map[f.ownerNode] ?? 0) + 1;
		}
		return map;
	}, [findings]);
	const [expanded, setExpanded] = useState(() => new Set(roots.map((r) => r.slug)));
	const [query, setQuery] = useState("");
	const selected = params.node ?? roots[0]?.slug ?? null;
	const setSelected = (slug) => navigate("tree", { node: slug });

	const toggle = (slug) =>
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(slug)) next.delete(slug);
			else next.add(slug);
			return next;
		});

	const matches = useMemo(() => {
		if (!query.trim()) return null;
		const q = query.toLowerCase();
		return nodes.filter((n) => n.slug.toLowerCase().includes(q) || n.paths.some((p) => p.toLowerCase().includes(q)));
	}, [nodes, query]);

	// A node reached by URL (a link from another screen) must be visible: open
	// its ancestor chain, or the right panel would describe a row nobody sees.
	useEffect(() => {
		if (!selected) return;
		const bySlug = new Map(nodes.map((n) => [n.slug, n]));
		const chain = [];
		for (let cur = bySlug.get(selected); cur; cur = cur.parents?.[0] ? bySlug.get(cur.parents[0]) : null) {
			chain.push(cur.slug);
			if (chain.length > 32) break;
		}
		setExpanded((prev) => {
			const next = new Set(prev);
			let changed = false;
			for (const slug of chain) if (!next.has(slug)) { next.add(slug); changed = true; }
			return changed ? next : prev;
		});
	}, [selected, nodes]);

	const node = selected ? nodes.find((n) => n.slug === selected) : null;
	const nodeRoles = node ? roles.filter((r) => (node.roles ?? []).includes(r.slug)) : [];
	const nodeFindings = node ? findings.filter((f) => f.ownerNode === node.slug) : [];

	// The folder's own corner of the graph: every arrow that touches it.
	const localEdges = useMemo(() => {
		if (!node) return [];
		return access.edges.filter((e) => e.from === node.slug || e.to === node.slug);
	}, [access.edges, node]);
	const localNodes = useMemo(() => {
		const seen = new Set([node?.slug].filter(Boolean));
		for (const e of localEdges) {
			seen.add(e.from);
			seen.add(e.to);
		}
		return nodes.filter((n) => seen.has(n.slug));
	}, [localEdges, nodes, node]);

	// The same action filter the Code Roles screen has: one folder's picture is
	// often only interesting filtered to `import`, `call`, …
	const [kind, setKind] = useState("all");
	useEffect(() => setKind("all"), [node?.slug]);
	const localKinds = useMemo(() => {
		const out = [];
		for (const e of localEdges) for (const k of e.kinds ?? [e.kind]) if (!out.includes(k)) out.push(k);
		return out;
	}, [localEdges]);
	const kindCounts = useMemo(() => {
		const map = new Map();
		for (const e of localEdges) for (const k of e.kinds ?? [e.kind]) map.set(k, (map.get(k) ?? 0) + 1);
		return map;
	}, [localEdges]);
	const shownEdges = useMemo(
		() => (kind === "all" ? localEdges : localEdges.filter((e) => (e.kinds ?? [e.kind]).includes(kind))),
		[localEdges, kind],
	);

	return (
		<Layout>
			<Panel>
				<PanelHead>
					<Title>Declared architecture</Title>
					<Subtle>click to expand</Subtle>
				</PanelHead>
				<SearchBox value={query} onChange={setQuery} placeholder="Find a node or path…" />
				<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
					{access.kinds.map((kind) => (
						<span key={kind} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: colors[kind] }}>
							<span style={{ width: 7, height: 7, borderRadius: 4, background: colors[kind] }} />
							{kind}
						</span>
					))}
				</div>
				<TreeBox style={{ marginTop: 10 }}>
					{matches ? (
						matches.slice(0, 60).map((n) => (
							<div
								key={n.slug}
								onClick={() => setSelected(n.slug)}
								style={{ cursor: "pointer", padding: "5px 8px", borderRadius: 6, fontSize: 12.5, fontFamily: "monospace", color: selected === n.slug ? "#6ea8fe" : "#c3ccd9" }}
							>
								{n.slug} <span style={{ color: "#6b7788" }}>— {n.paths[0]}</span>
							</div>
						))
					) : (
						roots.map((r) => (
							<TreeNode
								key={r.slug}
								node={r}
								childrenByParent={childrenByParent}
								expanded={expanded}
								onToggle={toggle}
								onSelect={setSelected}
								selected={selected}
								findingCounts={findingCounts}
								kindFlags={kindFlags}
								colors={colors}
							/>
						))
					)}
				</TreeBox>
			</Panel>

			<Panel>
				<PanelHead>
					<Title>{node ? node.paths[0] : "Node"}</Title>
					{node?.fileCount ? <Badge>{node.fileCount} files</Badge> : null}
					{nodeFindings.length ? <Badge color="#ff6b6b">{nodeFindings.length}</Badge> : null}
				</PanelHead>

				{node ? (
					<>
						{node.paths.slice(1).map((p) => (
							<PathLine key={p}>{p}</PathLine>
						))}

						<Section>
							<Label>code that may live here</Label>
							<div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
								{nodeRoles.map((r) => (
									<Badge key={r.slug} color="#b48ef0">
										{r.slug}
									</Badge>
								))}
								{!nodeRoles.length ? <Badge>structure only</Badge> : null}
								{node.closed ? <Badge color="#fbbf24">closed folder</Badge> : null}
							</div>
						</Section>

						<Section>
							<Label>what is imported or used in it, and what it imports or uses</Label>
							{localEdges.length ? (
								<>
									<FilterBar>
										<KindButton $active={kind === "all"} $color="#d7dee8" onClick={() => setKind("all")}>
											all {localEdges.length}
										</KindButton>
										{localKinds.map((k) => (
											<KindButton key={k} $active={kind === k} $color={colors[k]} onClick={() => setKind(k)}>
												{k} {kindCounts.get(k) ?? 0}
											</KindButton>
										))}
									</FilterBar>
									<AccessGraph nodes={localNodes} edges={shownEdges} kindColors={colors} focus={node.slug} height={220} />
								</>
							) : (
								<Subtle>no action names this folder — nothing is imported or used in it, and it imports or uses nothing.</Subtle>
							)}
						</Section>

						{node.sample ? (
							<Section>
								<Label>what it looks like</Label>
								<CodePanel title={node.sample.file} code={node.sample.lines.join("\n")} max="150px" />
							</Section>
						) : null}

						{nodeFindings.length ? (
							<Section>
								<Label>{nodeFindings.length} findings — click to open</Label>
								{nodeFindings.map((f, i) => (
									<FindingRow
										key={`${f.file}:${f.line}:${i}`}
										$color={f.category === "structure" ? "#f0a35e" : f.category === "codeRole" ? "#b48ef0" : "#56c8a8"}
										title={f.message}
										onClick={() => navigate("findings", { file: f.file, line: f.line })}
									>
										<FileLink>
											{f.file.replace(/^.*\//, "")}:{f.line}
										</FileLink>
										<span style={{ color: "#c3ccd9" }}>{f.title}</span>
									</FindingRow>
								))}
							</Section>
						) : null}
					</>
				) : (
					<Subtle>Select a node on the left.</Subtle>
				)}
			</Panel>
		</Layout>
	);
};
