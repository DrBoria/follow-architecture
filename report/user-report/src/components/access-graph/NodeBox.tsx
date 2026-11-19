"use strict";

// ONE BOX of the graph: its rectangle, its title (a role by NAME, a folder by
// path), its places or its one description line, its file count, and its
// self-rule badges. Every y comes from `textFlow` — the same arithmetic the
// layout uses to size the box — so a badge never lands on a place line.

import React from "react";
import { COL, textFlow, type LayoutNode, type Box } from "../../utils/layout";
import type { Mark } from "../../graph/representation/contract";

// Monospace advances ~0.6em per character; clip rather than overflow the box.
// A path is recognised by its END, so a long one loses its middle on a `/`
// boundary — cutting the tail left the one segment the reader needs gone.
const fit = (text: string | null | undefined, size = 10.5, reserved = 0): string => {
	const budget = Math.max(4, Math.floor((COL.width - 12 - reserved) / (size * 0.6)));
	const s = String(text ?? "");
	if (s.length <= budget) return s;
	const room = budget - 1;
	const headEnd = s.lastIndexOf("/", Math.ceil(room / 2));
	const tailStart = s.indexOf("/", s.length - Math.floor(room / 2));
	if (headEnd > 0 && tailStart > headEnd) return `${s.slice(0, headEnd + 1)}…${s.slice(tailStart)}`;
	return `${s.slice(0, room - 1)}…`;
};

// The glyph that goes in front of a repair's word. One table, so the box never
// shows a "split" sign next to the word "declare".
const GLYPH: Record<string, string> = { delete: "✕", split: "⑂", rewrite: "✎", merge: "⊕", declare: "◇", create: "＋", move: "→" };

// A self-relation badge: the action, and the roles that may do it.
type Loop = { kind: string; who: string[] };

// The box's verdict colours: wrong (red cross), right (green tick), active
// (blue), or neutral. One table, so fill and stroke always agree.
type BoxTone = { fill: string; stroke: string };
const toneOf = (mark: Mark | null, active: boolean): BoxTone => {
	if (mark === "wrong") return { fill: "rgba(255,92,92,0.14)", stroke: "#ff5c5c" };
	if (mark === "right") return { fill: "rgba(74,222,128,0.10)", stroke: "#4ade80" };
	if (active) return { fill: "rgba(110,168,254,0.20)", stroke: "#6ea8fe" };
	return { fill: "#161d2b", stroke: "#2a3547" };
};

type NodeBoxProps = {
	box: Box;
	node: LayoutNode;
	active: boolean;
	onClick?: () => void;
	onMore?: (slug: string) => void;
	dashed?: boolean;
	loops?: Loop[];
	mark?: Mark | null;
};

// The title and the places listed under it (a role is ONE thing with several
// homes; a folder's title IS its path, so no second line repeats it).
const titleOf = (node: LayoutNode): string =>
	node.places?.length || node.note ? node.name ?? node.slug : node.paths?.[0] ?? node.slug;

// The box's tooltip: its places, its note, or its path.
const tooltipOf = (node: LayoutNode, places: readonly string[]): string => {
	if (places.length) return `${node.name ?? node.slug}: ${places.join(", ")}`;
	if (node.note) return `${node.name ?? node.slug} — ${node.note}`;
	return node.paths?.[0] ?? node.slug;
};

// The rectangle's border: a verdict is dashed and thick, an active box thick,
// a placeless (role) box dashed, a folder plain.
const borderOf = (mark: Mark | null, active: boolean, dashed: boolean | undefined): { width: number; dash: string | undefined } => {
	if (mark) return { width: 2.2, dash: "6 4" };
	if (dashed) return { width: active ? 2 : 1, dash: "5 4" };
	return { width: active ? 2 : 1, dash: undefined };
};

// The verdict glyph in the corner (✕ / ✓), when the box carries one.
const MarkGlyph = ({ box, mark, stroke }: { box: Box; mark: Mark; stroke: string }): React.JSX.Element => (
	<text x={box.x + box.w - 10} y={box.y + box.h - 7} fill={stroke} fontSize="12" fontWeight="700" textAnchor="end" fontFamily="monospace">
		{mark === "wrong" ? "✕" : "✓"}
	</text>
);

// The self-rule badges below the text block.
const LoopBadges = ({ loops, box, ty, flow }: { loops: readonly Loop[]; box: Box; ty: (n: number) => number; flow: ReturnType<typeof textFlow> }): React.JSX.Element => (
	<>
		{loops.map((l, i) => (
			<text key={l.kind} x={box.x + 10} y={ty(flow.badgeYs[i])} fill="#8b9bb4" fontSize="8.5" fontFamily="monospace">
				↻ {l.kind}
				{l.who?.length ? ` · ${l.who.join(", ")}` : ""}
			</text>
		))}
	</>
);

// The box's text block: title, places (or the one description line), file count.
type BoxTextAsk = { node: LayoutNode; box: Box; title: string; places: string[]; label: string | null; flow: ReturnType<typeof textFlow>; ty: (n: number) => number; reserved: number; onMore?: (slug: string) => void };
const BoxText = ({ node, box, title, places, label, flow, ty, reserved, onMore }: BoxTextAsk): React.JSX.Element => (
	<>
		<text x={box.x + 10} y={ty(flow.nameY)} fill="#d7dee8" fontSize="10.5" fontWeight="600" fontFamily="monospace">
			{fit(title, 10, reserved)}
		</text>
		<PlaceLines places={places} box={box} ty={ty} flow={flow} reserved={reserved} onMore={onMore} slug={node.slug} />
		{!places.length && label ? (
			<text x={box.x + 10} y={ty(flow.labelY ?? 0)} fill={node.action ? "#c8a2ff" : "#6b7788"} fontSize="9" fontFamily="monospace">
				{fit(label, 9.5)}
			</text>
		) : null}
		{node.fileCount ? (
			<text x={box.x + box.w - 9} y={box.y + 13} fill="#6b7788" fontSize="10" textAnchor="end" fontFamily="monospace">
				{node.fileCount}f
			</text>
		) : null}
	</>
);

const NodeBox = ({ box, node, active, onClick, onMore, dashed, loops = [], mark = null }: NodeBoxProps): React.JSX.Element => {
	const title = titleOf(node);
	const places = (node.places ?? []).filter((p) => p !== title);
	const label = node.action ? `${GLYPH[node.action] ?? "•"} ${node.action}` : node.note ?? null;
	const flow = textFlow({ ...node, places }, loops.length, label);
	// A box is often taller than its text (it grows for the arrows leaving it),
	// so the block is centred: equal space above and below.
	const dy = Math.max(0, Math.round((box.h - flow.height) / 2));
	const ty = (offset: number): number => box.y + offset + dy;
	const tone = toneOf(mark, active);
	const border = borderOf(mark, active, dashed);
	const reserved = node.fileCount ? 26 : 0;

	return (
		<g onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
			<rect x={box.x} y={box.y} width={box.w} height={box.h} rx={9} fill={tone.fill} stroke={tone.stroke} strokeWidth={border.width} strokeDasharray={border.dash} />
			{mark ? <MarkGlyph box={box} mark={mark} stroke={tone.stroke} /> : null}
			<title>{tooltipOf(node, places)}</title>
			<BoxText node={node} box={box} title={title} places={places} label={label} flow={flow} ty={ty} reserved={reserved} onMore={onMore} />
			<LoopBadges loops={loops} box={box} ty={ty} flow={flow} />
		</g>
	);
};

// The place lines inside a role box: at most three, then a `+N more` control
// that opens the full list ON the canvas.
const PlaceLines = ({ places, box, ty, flow, reserved, onMore, slug }: { places: string[]; box: Box; ty: (n: number) => number; flow: ReturnType<typeof textFlow>; reserved: number; onMore?: (slug: string) => void; slug: string }): React.JSX.Element | null => {
	if (!places.length) return null;
	return (
		<>
			{places.slice(0, 3).map((pl, i) => (
				<text key={pl} x={box.x + 10} y={ty(flow.placeYs[i])} fill="#8b9bb4" fontSize="8.5" fontFamily="monospace">
					{fit(pl, 8.5, reserved)}
				</text>
			))}
			{places.length > 3 ? (
				<text
					x={box.x + 10}
					y={ty(flow.overflowY ?? 0)}
					fill="#6ea8fe"
					fontSize="8.5"
					fontFamily="monospace"
					style={{ cursor: "pointer", textDecoration: "underline" }}
					onPointerDown={(event) => {
						event.stopPropagation();
					}}
					onClick={(event) => {
						event.stopPropagation();
						onMore?.(slug);
					}}
				>
					+{places.length - 3} more
				</text>
			) : null}
		</>
	);
};

export { NodeBox, fit };
export type { Loop, NodeBoxProps };
