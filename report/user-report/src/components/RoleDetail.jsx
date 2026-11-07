import React from "react";
import styled from "styled-components";
import { Badge, Subtle } from "./ui";
import { CodePanel } from "./code-preview/CodePanel";
import { inferToYaml } from "../generate/infer";
import { describeQuery } from "../utils/describe";
import { nodeLabel } from "../utils/format";

// The role's answers are CARDS, not one tall column: each question ("how is it
// detected", "what is a real example", "what may be done with it") is its own
// small block, and the whole set flows across the page instead of squeezing into
// a 340px rail where nothing is readable.
const Dashboard = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
	/* Dense: a wide card (code, long prose) pulls the next short card up into the
	   hole it leaves, so the dashboard does not end in a ragged column of
	   half-empty cards. */
	grid-auto-flow: dense;
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
	/* The card is as wide as its CONTENT, not as wide as the grid cell: a card
	   holding three short rows used to be painted as a full-width empty box. */
	justify-self: start;
	width: fit-content;
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

// One boundary, ONE line, and it can never paint outside the card: every part of
// the row is shrinkable (min-width: 0) and every chip ellipsizes its text, so the
// sum always fits. The full text stays in the `title` of each chip.
const Arrow = styled.div`
	display: flex;
	flex-wrap: nowrap;
	align-items: center;
	gap: 7px;
	font-family: ${(p) => p.theme.font.mono};
	font-size: 12px;
	min-width: 0;
	max-width: 100%;

	/* The acting side is NOT shrunk: a short name like orchestrator is always
	   readable, and a long list of roles is capped at 45% and ellipsized (its full
	   text is in the title). The target column takes the rest and ellipsizes. */
	& > span:first-child {
		flex: 0 0 auto;
		min-width: 0;
		max-width: 45%;
	}
`;

// The arrow and its target travel together as flex items (no extra box), so the
// arrow is drawn right after the acting chip and immediately before the target.
const Link = styled.span`
	display: contents;
`;

const ArrowGlyph = styled.span`
	flex: none;
	white-space: nowrap;
	color: ${(p) => p.theme.color.textDim};
`;

// The right side may carry several chips (the role itself, a `via` clause, a
// `checked as` note): one line, each chip ellipsizing on its own.
const Targets = styled.span`
	display: flex;
	flex-wrap: nowrap;
	align-items: center;
	gap: 5px;
	flex: 1 1 auto;
	min-width: 0;
`;

const Chip = styled.span`
	border: 1px solid ${(p) => `${p.$c}66`};
	background: ${(p) => `${p.$c}1a`};
	color: ${(p) => p.$c};
	border-radius: 6px;
	padding: 1px 7px;
	/* One line, ellipsized: a chip never wraps its text and never overflows the
	   row — the full value is in its title. */
	min-width: 0;
	max-width: 100%;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	box-sizing: border-box;
`;

// The finding message is prose, not a code snippet: set it as a quote with room
// to breathe, so it does not read as a footnote next to the code cards.
const Quote = styled.blockquote`
	margin: 0;
	padding: 8px 0 8px 12px;
	border-left: 2px solid ${(p) => p.theme.color.border};
	color: ${(p) => p.theme.color.text};
	font-size: 13px;
	line-height: 1.5;
	overflow-wrap: anywhere;
`;

const Fix = styled.div`
	font-size: 12.5px;
	line-height: 1.5;
	color: #8ce6a8;
	overflow-wrap: anywhere;
`;

const codeOf = (example) => (example?.code ? example.code.lines.join("\n") : null);

export const RoleDetail = ({ role, nodes, graph = null, showInfer = true }) => {
	const example = role.examples?.[0] ?? null;
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

			{outgoing.length ? (
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
			) : null}

			{role.actions?.length ? (
				<Section $wide>
					<Label>what may be done with this role, and by whom</Label>
					{role.actions.map((a) => {
						const from = a.from.length ? a.from.join(" | ") : "nobody";
						const via = a.scopeAccess?.length ? `via ${a.scopeAccess.map((x) => x.segments.join(".")).join(" · ")}` : null;
						return (
							<Arrow key={a.kind}>
								<Chip $c="#8b9bb4" title={from}>
									{from}
								</Chip>
								<Link>
									<ArrowGlyph style={{ color: "#6ea8fe" }}>──{a.kind}──▶</ArrowGlyph>
									<Targets>
										{a.of ? (
											<Chip $c="#8b9bb4" title={`checked as ${a.of}`}>
												checked as {a.of}
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
					})}
				</Section>
			) : null}

			{role.report?.message ? (
				<Section $wide>
					<Label>reported when misfiled</Label>
					{/* The message is a template: `{what}`, `{path}`, `{destination}`. Shown
					    raw it reads like a bug, so it is filled from the example that is
					    printed right next to it — the sentence a reader would actually see. */}
					<Quote>{fill(role.report.message)}</Quote>
					{role.report.fix ? <Fix>→ {fill(role.report.fix)}</Fix> : null}
				</Section>
			) : null}

		</Dashboard>
	);
};
