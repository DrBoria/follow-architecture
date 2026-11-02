import React from "react";
import styled from "styled-components";
import { Badge, Subtle } from "./ui";
import { CodePanel } from "./code-preview/CodePanel";
import { inferToYaml } from "../generate/infer";
import { allowedImporters, badWiring, goodWiring } from "../generate/wiring";
import { describeQuery } from "../utils/describe";
import { nodeLabel } from "../utils/format";

// The role's answers are CARDS, not one tall column: each question ("how is it
// detected", "what is a real example", "what may be done with it") is its own
// small block, and the whole set flows across the page instead of squeezing into
// a 340px rail where nothing is readable.
const Dashboard = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
	gap: 14px;
	align-items: start;
	width: 100%;
	min-width: 0;
`;

const Section = styled.section`
	display: grid;
	gap: 6px;
	align-content: start;
	background: ${(p) => p.theme.color.panel};
	border: 1px solid ${(p) => p.theme.color.border};
	border-radius: ${(p) => p.theme.radius.md};
	padding: ${(p) => p.theme.space(4)};
	min-width: 0;
	max-width: 100%;
	box-sizing: border-box;
	/* A card that needs room (code, yaml, a long message) spans two columns when
	   the grid has them, and collapses to one on a narrow screen. */
	${(p) => (p.$wide ? "@media (min-width: 700px) { grid-column: span 2; }" : "")}
`;

const Label = styled.div`
	font-size: 10.5px;
	text-transform: uppercase;
	letter-spacing: 0.7px;
	color: ${(p) => p.theme.color.textFaint};
`;

const Arrow = styled.div`
	display: flex;
	align-items: center;
	gap: 7px;
	font-family: ${(p) => p.theme.font.mono};
	font-size: 12px;
	flex-wrap: wrap;
`;

const Chip = styled.span`
	border: 1px solid ${(p) => `${p.$c}66`};
	background: ${(p) => `${p.$c}1a`};
	color: ${(p) => p.$c};
	border-radius: 6px;
	padding: 1px 7px;
`;

const codeOf = (example) => (example?.code ? example.code.lines.join("\n") : null);

export const RoleDetail = ({ role, nodes, graph = null, showInfer = true }) => {
	const example = role.examples?.[0] ?? null;
	const good = goodWiring(role, nodes);
	const bad = badWiring(role, nodes);
	const allowed = allowedImporters(role);
	const conditions = role.infer ? (Array.isArray(role.infer) ? role.infer : [role.infer]).flatMap(describeQuery) : [];
	const home = role.homes?.[0] ?? null;
	// The other half of the boundary: what code of THIS role may reach. The
	// actions above answer "who may touch it"; a role that declares no actions
	// of its own (a controller) would otherwise look like it does nothing.
	const byKind = new Map();
	for (const e of graph?.edges ?? []) {
		if (!(e.actorRoles ?? []).includes(role.slug) || e.from === e.to) continue;
		if (!byKind.has(e.kind)) byKind.set(e.kind, []);
		const list = byKind.get(e.kind);
		if (!list.includes(e.toPath)) list.push(e.toPath);
	}
	const outgoing = [...byKind].map(([kind, targets]) => ({ kind, targets }));

	// A report template read literally (`{what} writes into a store …`) looks like
	// a broken message. Filled with the example this role actually has, it is the
	// sentence the rule prints — which is the point of showing it at all.
	const values = {
		what: example?.name ?? role.name ?? "",
		path: example?.file ?? "",
		destination: home?.paths?.[0] ?? "…",
		destinationSlug: home?.slug ?? "…",
		folder: example?.file ? example.file.split("/").slice(0, -1).join("/") : "",
	};
	const fill = (text) =>
		String(text ?? "").replace(/\{([A-Za-z]+)\}/g, (whole, key) => (values[key] != null && values[key] !== "" ? values[key] : whole));

	return (
		<Dashboard>
			{showInfer ? (
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
			) : null}

			{role.exampleCount === 0 ? (
				<div style={{ fontSize: 12.5, color: "#fbbf24" }}>
					No code in this repository matches this role — the declared `infer` block classifies nothing here.
				</div>
			) : null}

			{example && codeOf(example) ? (
				<Section $wide>
					<Label>real example</Label>
					<CodePanel
						tone="good"
						title={`${example.name} — ${example.file}:${example.line}`}
						code={codeOf(example)}
						max="230px"
					/>
				</Section>
			) : (
				<Subtle>no matches in this repository</Subtle>
			)}

			{good || bad ? (
				<Section>
					<Label>how it is wired in</Label>
					{home ? (
						<Arrow>
							<Chip $c="#4ade80">{good ? good.title : "allowed importer"}</Chip>
							<span style={{ color: "#4ade80" }}>──▶</span>
							<Chip $c="#8b9bb4">{nodeLabel(home, 2)}</Chip>
						</Arrow>
					) : null}
					{bad ? (
						<Arrow>
							<Chip $c="#ff6b6b">{bad.title}</Chip>
							<span style={{ color: "#ff6b6b" }}>──✕──▶</span>
							<Chip $c="#fbbf24">{home ? nodeLabel(home, 2) : ""}</Chip>
						</Arrow>
					) : null}
					{allowed.length ? (
						<Subtle>
							only these are allowed to import it: <code>{allowed.join(", ")}</code>
						</Subtle>
					) : null}
				</Section>
			) : null}

			{good ? <CodePanel tone="good" title={`import from ${good.title}`} code={good.code} note={good.note} max="120px" /> : null}
			{bad ? <CodePanel tone="bad" title={`import from ${bad.title}`} code={bad.code} note={bad.note} max="120px" /> : null}

			{role.actions?.length ? (
				<Section>
					<Label>what may be done with this role, and by whom</Label>
					{role.actions.map((a) => (
						<Arrow key={a.kind}>
							<Chip $c="#8b9bb4">{a.from.length ? a.from.join(" | ") : "nobody"}</Chip>
							<span style={{ color: "#6ea8fe" }}>──{a.kind}──▶</span>
							{a.of ? <Chip $c="#8b9bb4">checked as {a.of}</Chip> : null}
							<Chip $c="#f0a35e">{role.slug}</Chip>
							{a.scopeAccess?.length ? <Chip $c="#56c8a8">via {a.scopeAccess.map((x) => x.segments.join(".")).join(" · ")}</Chip> : null}
						</Arrow>
					))}
				</Section>
			) : null}

			{outgoing.length ? (
				<Section>
					<Label>what this role's code may do</Label>
					{outgoing.map((o) => (
						<Arrow key={o.kind}>
							<Chip $c="#f0a35e">{role.slug}</Chip>
							<span style={{ color: "#6ea8fe" }}>──{o.kind}──▶</span>
							<Chip $c="#8b9bb4">{o.targets.join(" · ")}</Chip>
						</Arrow>
					))}
				</Section>
			) : null}

			{role.report?.message ? (
				<Section>
					<Label>reported when misfiled</Label>
					{/* The message is a template: `{what}`, `{path}`, `{destination}`. Shown
					    raw it reads like a bug, so it is filled from the example that is
					    printed right next to it — the sentence a reader would actually see. */}
					<div style={{ fontSize: 12.5, color: "#c3ccd9" }}>{fill(role.report.message)}</div>
					{role.report.fix ? <div style={{ fontSize: 12.5, color: "#8ce6a8" }}>{fill(role.report.fix)}</div> : null}
				</Section>
			) : null}

			{role.homes?.length ? (
				<Section>
					<Label>may live in</Label>
					{role.homes.map((h) => (
						<div key={h.slug} style={{ fontSize: 12, fontFamily: "monospace" }}>
							<span style={{ color: "#6ea8fe" }}>{nodeLabel(h, 2)}</span>{" "}
							<span style={{ color: "#6b7788" }}>{h.paths?.join(" | ")}</span>
						</div>
					))}
				</Section>
			) : null}
		</Dashboard>
	);
};
