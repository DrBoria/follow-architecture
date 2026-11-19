"use strict";

// THE ARROWS of the graph: one path per link, with its label pill (placed by the
// layout, guaranteed off every box), its arrowhead marker, and a wide invisible
// hit path for hovering. A broken relation is the finding itself: bright red,
// dashed, labelled with a cross.

import React from "react";
import { edgeLines, type Box, type Link } from "../../utils/layout";

// The label lines of one edge: the actions (crossed when broken), then the
// reach mechanisms in the scope colour.
const linesOf = (edge: Link["edge"], broken: boolean, color: string): { text: string; fill: string }[] => {
	const { kinds, via } = edgeLines(edge);
	return [...kinds.map((k) => ({ text: broken ? `✕ ${k}` : k, fill: color })), ...via.map((v) => ({ text: v, fill: "#56c8a8" }))];
};

// A label ON a box is unreadable: whatever the layout decides, a pill whose
// rectangle touches a box is not drawn.
const overBoxOf = (spot: { lx: number; ly: number; pill: number; lineCount: number }, boxes: readonly Box[]): boolean => {
	const { lx, ly, pill, lineCount } = spot;
	return boxes.some((b) => lx - pill / 2 < b.x + b.w && lx + pill / 2 > b.x && ly - 8.5 < b.y + b.h && ly - 8.5 + lineCount * 11 + 2 > b.y);
};

// The label pill: its background rect and its lines.
type PillAsk = { lx: number; ly: number; pill: number; lines: { text: string; fill: string }[]; broken: boolean; color: string };
const Pill = ({ lx, ly, pill, lines, broken, color }: PillAsk): React.JSX.Element => (
	<>
		<rect x={lx - pill / 2} y={ly - 8.5} width={pill} height={lines.length * 11 + 2} rx={3} fill={broken ? "#2a0d0d" : "#0a0d13"} stroke={color} strokeOpacity={broken ? 0.95 : 0.4} />
		{lines.map((l, n) => (
			<text key={`${l.text}-${n}`} x={lx} y={ly + n * 11} fill={l.fill} fontSize="9" textAnchor="middle" fontFamily="monospace">
				{l.text}
			</text>
		))}
	</>
);

// The wire's stroke: a broken arrow is thick and fully opaque, a hovered one
// thick, a plain one thin and translucent.
const strokeOf = (broken: boolean, isActive: boolean): { width: number; opacity: number } => {
	if (broken) return { width: 3.2, opacity: 1 };
	if (isActive) return { width: 3, opacity: 1 };
	return { width: 1.7, opacity: 0.7 };
};

// One arrow: its wire, its label pill (when it has a legal spot), its hit path.
const Edge = ({ link, boxes, colorOf, active, onHover }: { link: Link; boxes: readonly Box[]; colorOf: (kind: string) => string; active: Link["edge"] | null; onHover: (edge: Link["edge"] | null) => void }): React.JSX.Element => {
	const { edge, path, lx, ly } = link;
	const broken = edge.broken === true;
	const color = broken ? "#ff5c5c" : colorOf(edge.kind);
	const stroke = strokeOf(broken, active === edge);
	const lines = linesOf(edge, broken, color);
	const pill = Math.max(...lines.map((l) => l.text.length * 5.4 + 10));
	const overBox = lx != null && overBoxOf({ lx, ly: ly ?? 0, pill, lineCount: lines.length }, boxes);
	return (
		<g onMouseEnter={() => onHover(edge)} onMouseLeave={() => onHover(null)}>
			<path d={path} fill="none" stroke={color} strokeWidth={stroke.width} strokeOpacity={stroke.opacity} strokeDasharray={broken ? "7 5" : undefined} markerEnd={`url(#acc-arrow-${broken ? "broken" : edge.kind})`} />
			{lx != null && !overBox ? <Pill lx={lx} ly={ly ?? 0} pill={pill} lines={lines} broken={broken} color={color} /> : null}
			<path d={path} fill="none" stroke="transparent" strokeWidth={14} />
		</g>
	);
};

type EdgeLayerProps = {
	links: readonly Link[];
	positions: Map<string, Box>;
	colorOf: (kind: string) => string;
	active: Link["edge"] | null;
	onHover: (edge: Link["edge"] | null) => void;
};

const EdgeLayer = ({ links, positions, colorOf, active, onHover }: EdgeLayerProps): React.JSX.Element => {
	const boxes = [...positions.values()];
	return (
		<>
			{links.map((link, i) => (
				<Edge key={`l${i}`} link={link} boxes={boxes} colorOf={colorOf} active={active} onHover={onHover} />
			))}
		</>
	);
};

// The arrowhead markers: one per kind colour, plus the broken one.
const ArrowDefs = ({ kindColors }: { kindColors: Record<string, string> }): React.JSX.Element => (
	<defs>
		<marker id="acc-arrow-broken" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
			<path d="M 0 0 L 10 5 L 0 10 z" fill="#ff5c5c" />
		</marker>
		{Object.entries(kindColors ?? {}).map(([kind, color]) => (
			<marker key={kind} id={`acc-arrow-${kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
				<path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
			</marker>
		))}
	</defs>
);

export { EdgeLayer, ArrowDefs };
