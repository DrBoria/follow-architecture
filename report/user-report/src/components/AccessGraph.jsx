import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { COL, buildGraph, edgeLines, visibleSlugs, textFlow } from "../utils/layout";
import { nodeLabel } from "../utils/format";

// A folder-access graph: the boxes are the DECLARED nodes, the arrows are the
// actions the architecture allows between them (`import`, `usage`, `mutation`
// or whatever the config named). Nothing here knows a kind by name — the
// colours come from the caller, indexed by the config's own action order.

const PAD_X = 20;
const PAD_Y = 16;

const Canvas = styled.div`
	max-width: 100%;
	min-width: 0;
	overflow: hidden;
	touch-action: none;
	background: #0a0d13;
	border: 1px solid ${(p) => p.theme.color.border};
	border-radius: ${(p) => p.theme.radius.md};
	cursor: ${(p) => (p.$panning ? "grabbing" : "grab")};
`;

// Zoom limits: 1 = the whole graph fits (what the panel shows by default),
// 12 = one folder name is comfortably readable. Below 1 there is nothing to see.
const ZOOM_MIN = 1;
const ZOOM_MAX = 12;
const ZOOM_STEP = 1.35;

// The canvas height is a CSS decision, not a JS one: a media query doubles it on
// a wide screen, so the drawing grows with the page without a resize listener
// (a listener missed the change when the window was resized programmatically).
const GraphSvg = styled.svg`
	display: block;
	width: 100%;
	max-width: 100%;
	touch-action: none;
	height: ${(p) => (p.$full ? "100%" : `${Math.max(p.$h, 260)}px`)};
	${(p) =>
		p.$grow
			? `@media (min-width: 1200px) { height: ${p.$full ? "100%" : `${Math.max(p.$h * 2, 520)}px`}; }`
			: ""}
`;

const ZoomBar = styled.div`
	position: absolute;
	right: 8px;
	top: 8px;
	display: flex;
	align-items: center;
	gap: 2px;
	padding: 2px;
	border-radius: ${(p) => p.theme.radius.md};
	border: 1px solid ${(p) => p.theme.color.border};
	background: rgba(10, 13, 19, 0.88);
	font-family: monospace;
	font-size: 11px;
	user-select: none;
`;

// The opened place list: an overlay ON the canvas, because the control that
// opens it lives on the canvas. It used to render under the drawing, which put
// the answer out of sight and made `+N more` look like a dead control.
const PlacesPanel = styled.div`
	position: absolute;
	left: 10px;
	bottom: 10px;
	right: 10px;
	z-index: 3;
	max-height: 45%;
	overflow: auto;
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 8px 12px;
	padding: 8px 10px;
	border: 1px solid ${(p) => p.theme.color.border};
	border-radius: 8px;
	background: rgba(11, 16, 23, 0.94);
	font-family: monospace;
	font-size: 11.5px;
	color: #c3ccd9;
`;

// Fullscreen preview: the SAME graph, the same state, drawn over the whole
// window. Not a second canvas — the drawing does not jump or re-layout, it only
// gets room, so the reader keeps the folder they were looking at.
const Overlay = styled.div`
	position: fixed;
	inset: 0;
	z-index: 50;
	display: flex;
	flex-direction: column;
	background: #070a10;
	padding: 12px;
	gap: 8px;
`;

const OverlayHead = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
	font-family: monospace;
	font-size: 12px;
	color: ${(p) => p.theme.color.subtle};
`;

const ZoomBtn = styled.button`
	width: 22px;
	height: 22px;
	border: 0;
	border-radius: 4px;
	background: transparent;
	color: ${(p) => p.theme.color.text};
	font: inherit;
	line-height: 1;
	cursor: pointer;
	&:hover { background: rgba(110, 168, 254, 0.18); }
	&:disabled { color: ${(p) => p.theme.color.subtle}; cursor: default; background: transparent; }
`;

// The percentage is a BUTTON too (click = fit again), so it cannot be the fixed
// 22px square the icon buttons are: it sizes to its own text.
const Pct = styled(ZoomBtn)`
	width: auto;
	min-width: 44px;
	padding: 0 6px;
`;

// Monospace advances ~0.6em per character; clip rather than overflow the box,
// so a label never paints over the box edge or the file count in the corner.
const fit = (text, size = 10.5, reserved = 0) => {
	const budget = Math.max(4, Math.floor((COL.width - 12 - reserved) / (size * 0.6)));
	const s = String(text ?? "");
	if (s.length <= budget) return s;
	// A path is recognised by its END (`…/actions`), so a long one loses its
	// middle, on a `/` boundary — cutting the tail left `apps/backend/{kebab-case}/…`
	// with the one segment the reader needs gone.
	const room = budget - 1;
	const headEnd = s.lastIndexOf("/", Math.ceil(room / 2));
	const tailStart = s.indexOf("/", s.length - Math.floor(room / 2));
	if (headEnd > 0 && tailStart > headEnd) return `${s.slice(0, headEnd + 1)}…${s.slice(tailStart)}`;
	return `${s.slice(0, room - 1)}…`;
};

// The glyph that goes in front of a repair's word. One table, so the box never
// shows a "split" sign next to the word "declare".
const GLYPH = { delete: "✕", split: "⑂", rewrite: "✎", merge: "⊕", declare: "◇", create: "＋", move: "→" };

const NodeBox = ({ box, node, active, onClick, onMore, dashed, loops = [], mark = null }) => {
	// ONE path per box. A role is titled by its NAME and lists the places it may
	// be met at; a folder is titled by its path and needs no second line repeating
	// it — that line was the same string one row down, and it read as a mistake.
	const title = node.places?.length ? (node.name ?? node.slug) : (node.paths?.[0] ?? node.slug);
	const places = (node.places ?? []).filter((p) => p !== title);
	// No second line for a folder: the title IS its path (shortened to the box
	// width, the full one in the tooltip). Repeating it one row down was the
	// "why is the same path printed twice" look. A box that has an ACTION to show
	// uses that line for it — a rule with no destination still says what it wants.
	const label = node.action ? `${GLYPH[node.action] ?? "•"} ${node.action}` : null;
	// Every `y` below comes from `textFlow` — the same function the layout uses to
	// size the box. Hardcoding the offsets here is what let a badge land on text.
	const flow = textFlow({ ...node, places }, loops.length, label);
	// A box is often taller than its text (it grows for the arrows leaving it), so
	// the block is centred in it: equal space above and below, never "text glued
	// to the top with a hole under it".
	const dy = Math.max(0, Math.round((box.h - flow.height) / 2));
	const ty = (offset) => box.y + offset + dy;
	// A box is the code's PLACE. `wrong` says the code in it does not belong
	// there (the finding is about the placement itself), `right` is where it
	// belongs: red cross vs green tick, both drawn on the box.
	const fill = mark === "wrong" ? "rgba(255,92,92,0.14)" : mark === "right" ? "rgba(74,222,128,0.10)" : active ? "rgba(110,168,254,0.20)" : "#161d2b";
	const stroke = mark === "wrong" ? "#ff5c5c" : mark === "right" ? "#4ade80" : active ? "#6ea8fe" : "#2a3547";
	return (
		<g onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
			<rect
				x={box.x}
				y={box.y}
				width={box.w}
				height={box.h}
				rx={9}
				fill={fill}
				stroke={stroke}
				strokeWidth={mark ? 2.2 : active ? 2 : 1}
				strokeDasharray={mark ? "6 4" : dashed ? "5 4" : undefined}
			/>
			{mark ? (
				<text x={box.x + box.w - 10} y={box.y + box.h - 7} fill={stroke} fontSize="12" fontWeight="700" textAnchor="end" fontFamily="monospace">
					{mark === "wrong" ? "✕" : "✓"}
				</text>
			) : null}
			<title>{places.length ? `${node.name ?? node.slug}: ${places.join(", ")}` : node.paths?.[0] ?? node.slug}</title>
			{/* A box grows to fit the arrows leaving it, so the text is centred in
			    whatever height it got instead of hugging the top edge. */}
			<text x={box.x + 10} y={ty(flow.nameY)} fill="#d7dee8" fontSize="10.5" fontWeight="600" fontFamily="monospace">
				{fit(title, 10, node.fileCount ? 26 : 0)}
			</text>
			{/* A role is ONE thing that may be met in several places: the places are
			    listed inside its box, so "controller" reads as one entity with three
			    homes instead of three boxes that look unrelated. */}
			{places.length ? (
				<>
					{places.slice(0, 3).map((pl, i) => (
						<text key={pl} x={box.x + 10} y={ty(flow.placeYs[i])} fill="#8b9bb4" fontSize="8.5" fontFamily="monospace">
							{/* The place keeps clear of the file count in the corner, exactly
							    like the title does — otherwise a long path runs under it. */}
							{fit(pl, 8.5, node.fileCount ? 26 : 0)}
						</text>
					))}
					{places.length > 3 ? (
						// A real control, not a dead label: it opens the full list of
						// places ON the canvas (the box itself has no room to grow, and
						// growing it would move every port and arrow). The line sits right
						// after the last place, in the same flow — a fixed offset was what
						// printed `+1 more` on top of the place above it.
						<text
							x={box.x + 10}
							y={ty(flow.overflowY)}
							fill="#6ea8fe"
							fontSize="8.5"
							fontFamily="monospace"
							style={{ cursor: "pointer", textDecoration: "underline" }}
							// The canvas captures the pointer to pan when zoomed; without
							// stopping it here the control receives nothing and reads as dead.
							onPointerDown={(event) => {
								event.stopPropagation();
							}}
							onClick={(event) => {
								event.stopPropagation();
								onMore?.(node.slug);
							}}
						>
							+{places.length - 3} more
						</text>
					) : null}
				</>
			) : label ? (
				<text x={box.x + 10} y={ty(flow.labelY)} fill={node.action ? "#c8a2ff" : "#6b7788"} fontSize="9" fontFamily="monospace">
					{fit(label, 9.5)}
				</text>
			) : null}
			{node.fileCount ? (
				<text x={box.x + box.w - 9} y={box.y + 13} fill="#6b7788" fontSize="10" textAnchor="end" fontFamily="monospace">
					{node.fileCount}f
				</text>
			) : null}
			{/* A self-relation is a property of the folder, not a place on the
			    canvas, so it is written ON the folder — WITH the role that may do
			    it, otherwise "who may mutate an action?" has no answer here.
			    They start BELOW the text block: the box grows for them (see
			    `textHeightOf` in layout), so a badge never lands on a place line. */}
			{loops.map((l, i) => {
				return (
					<text key={l.kind} x={box.x + 10} y={ty(flow.badgeYs[i])} fill="#8b9bb4" fontSize="8.5" fontFamily="monospace">
						↻ {l.kind}
						{l.who?.length ? ` · ${l.who.join(", ")}` : ""}
					</text>
				);
			})}
		</g>
	);
};

// Memoised: the layout below is `buildGraph` over every visible node and edge, and
// a parent that re-renders on each keystroke must not pay for it. Props are arrays
// and objects, so the CALLER memoises them too (see FindingsScreen).
export const AccessGraph = React.memo(function AccessGraph({ nodes, edges, kindColors, focus = null, onFocus = null, height = 320, showAll = false, growOnWide = false, marks = {}, keep = [] }) {
	const [hover, setHover] = useState(null);
	// The node whose full place list is open (“+N more”).
	const [placesFor, setPlacesFor] = useState(null);

	// Self-relations are rendered as a badge on the box (see NodeBox), so the
	// canvas keeps only arrows between different folders.
	const drawEdges = useMemo(() => edges.filter((e) => e.from !== e.to), [edges]);
	const loopKinds = useMemo(() => {
		const map = new Map();
		for (const e of edges) {
			if (e.from !== e.to) continue;
			if (!map.has(e.from)) map.set(e.from, []);
			const list = map.get(e.from);
			const who = e.actorRole ? [e.actorRole] : (e.actorRoles ?? []);
			// A merged edge carries several actions on the same folder pair.
			for (const kind of e.kinds ?? [e.kind]) {
				const existing = list.find((l) => l.kind === kind);
				if (existing) {
					for (const r of who) if (!existing.who.includes(r)) existing.who.push(r);
				} else list.push({ kind, who: [...who] });
			}
		}
		return map;
	}, [edges]);
	const visible = useMemo(() => visibleSlugs({ nodes, edges, focus, showAll, keep }), [nodes, edges, focus, showAll, keep]);
	const drawNodes = useMemo(() => nodes.filter((n) => visible.has(n.slug)), [nodes, visible]);
	// The box has to be tall enough for ITS OWN text: the name, one line per place
	// it may be met at, and one badge per self-rule. Height used to be decided by
	// the arrow count alone, so a role with three places drew its last place on
	// top of its own self-rule badges.
	const loopsOf = useCallback((slug) => loopKinds.get(slug)?.length ?? 0, [loopKinds]);
	const { positions, width, height: h, links } = useMemo(() => buildGraph(drawNodes, drawEdges, { loopsOf }), [drawNodes, drawEdges, loopsOf]);

	const selfCount = useMemo(() => edges.filter((e) => e.from === e.to).length, [edges]);
	const active = hover ?? null;
	const colorOf = (kind) => kindColors?.[kind] ?? "#7d8899";
	const placesNode = placesFor ? drawNodes.find((n) => n.slug === placesFor) : null;

	// ── Zoom and pan ─────────────────────────────────────────────────────────
	// The canvas is a VIEWPORT onto the graph: the `viewBox` is the rectangle of
	// graph space currently on screen. Zooming shrinks that rectangle, panning
	// moves it — one coordinate system, so labels, arrow widths and gaps scale
	// together and nothing can drift out of alignment.
	//
	// The rectangle always has the element's own aspect ratio (see `viewBoxOf`),
	// which is what makes "zoom where the cursor is" exact: without it the SVG
	// letterboxes the drawing and the point under the cursor moves while zooming.
	const fullW = width + PAD_X * 2;
	const fullH = Math.max(h, height) + PAD_Y * 2;
	const [zoom, setZoom] = useState({ s: 1, x: 0, y: 0 });
	// Fullscreen preview of the same drawing. Declared with the other state: an
	// effect below already depends on it.
	const [full, setFull] = useState(false);
	const [box, setBox] = useState({ w: 0, h: 0 });
	// The element itself is state, not a ref: the same drawing is mounted in the
	// inline panel or in the fullscreen overlay, and every measurement has to
	// follow whichever node is on screen right now.
	const [svgEl, setSvgEl] = useState(null);
	const drag = useRef(null);
	const [panning, setPanning] = useState(false);

	// The element's pixel size decides the viewport's shape. Measured rather than
	// assumed: the panel is a responsive grid cell.
	useEffect(() => {
		const el = svgEl;
		if (!el || typeof ResizeObserver === "undefined") return undefined;
		const observer = new ResizeObserver(([entry]) => {
			const r = entry?.contentRect;
			if (r) setBox({ w: r.width, h: r.height });
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [svgEl]);

	// The graph rectangle that fits the whole drawing, keeping the viewport's own
	// aspect ratio. At scale 1 nothing is cut off; a wider panel simply shows the
	// extra room instead of shrinking the graph.
	const fit = useMemo(() => {
		const ratio = box.w && box.h ? box.h / box.w : 0;
		const w = ratio ? Math.max(fullW, fullH / ratio) : fullW;
		return { w, h: ratio ? w * ratio : fullH };
	}, [box.w, box.h, fullW, fullH]);

	const clampPan = useCallback(
		(view, viewW, viewH) => ({
			s: view.s,
			// A viewport wider than the drawing stays centred; otherwise it stays
			// inside it. Both cases are the same interval, just with its bounds
			// swapped, so one clamp covers them.
			x: Math.min(Math.max(view.x, Math.min(0, fullW - viewW)), Math.max(0, fullW - viewW)),
			y: Math.min(Math.max(view.y, Math.min(0, fullH - viewH)), Math.max(0, fullH - viewH)),
		}),
		[fullW, fullH],
	);

	const centred = useCallback((s) => clampPan({ s, x: (fullW - fit.w / s) / 2, y: (fullH - fit.h / s) / 2 }, fit.w / s, fit.h / s), [clampPan, fit, fullW, fullH]);

	// A re-laid-out graph is a different drawing: a zoom level kept across it would
	// point at empty canvas, so the view starts again at "fits".
	useEffect(() => setZoom(centred(1)), [centred, drawNodes.length, width, h, full]);

	// Zoom around a POINT (the cursor): the graph coordinate under it stays under
	// it, so the reader's eye does not lose its place.
	const zoomAt = useCallback(
		(factor, clientX, clientY) => {
			const rect = svgEl?.getBoundingClientRect();
			setZoom((view) => {
				const s = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, view.s * factor));
				if (s === view.s) return view;
				const viewW = fit.w / s;
				const viewH = fit.h / s;
				const u = rect?.width ? (clientX - rect.left) / rect.width : 0.5;
				const v = rect?.height ? (clientY - rect.top) / rect.height : 0.5;
				// The point under the cursor in graph units, before the change.
				const gx = view.x + u * (fit.w / view.s);
				const gy = view.y + v * (fit.h / view.s);
				return clampPan({ s, x: gx - u * viewW, y: gy - v * viewH }, viewW, viewH);
			});
		},
		[clampPan, fit, svgEl],
	);

	const zoomCentre = useCallback(
		(factor) => {
			const rect = svgEl?.getBoundingClientRect();
			zoomAt(factor, rect ? rect.left + rect.width / 2 : 0, rect ? rect.top + rect.height / 2 : 0);
		},
		[zoomAt, svgEl],
	);

	// A wheel over the canvas zooms; the page must not scroll away under the
	// reader, so the listener is attached natively — React's onWheel is passive in
	// some builds, and `preventDefault` there would be ignored.
	useEffect(() => {
		const el = svgEl;
		if (!el) return undefined;
		const onWheel = (event) => {
			event.preventDefault();
			zoomAt(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, event.clientX, event.clientY);
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, [zoomAt, svgEl]);

	// Esc leaves the preview: it is the one key a full-window layer must answer.
	useEffect(() => {
		if (!full) return undefined;
		const onKey = (event) => {
			if (event.key === "Escape") setFull(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [full]);

	const onPointerDown = (event) => {
		if (zoom.s <= 1) return;
		drag.current = { x: event.clientX, y: event.clientY, vx: zoom.x, vy: zoom.y, moved: false };
		event.currentTarget.setPointerCapture?.(event.pointerId);
		setPanning(true);
	};
	const onPointerMove = (event) => {
		const d = drag.current;
		const rect = svgEl?.getBoundingClientRect();
		if (!d || !rect?.width) return;
		const viewW = fit.w / zoom.s;
		const viewH = fit.h / zoom.s;
		// Screen pixels → graph units: a drag of half the panel moves half the view.
		const dx = ((event.clientX - d.x) / rect.width) * viewW;
		const dy = ((event.clientY - d.y) / rect.height) * viewH;
		if (Math.abs(event.clientX - d.x) > 2 || Math.abs(event.clientY - d.y) > 2) d.moved = true;
		setZoom((view) => clampPan({ s: view.s, x: d.vx - dx, y: d.vy - dy }, viewW, viewH));
	};
	const onPointerUp = () => {
		drag.current = null;
		setPanning(false);
	};

	// The viewBox IS the zoom window: `fit.w / s` graph units across the panel.
	// Zooming shrinks the window, panning moves it — one coordinate system, so
	// nothing can drift out of alignment.
	//
	// The drawing is ONE element used in two places: the inline panel and the
	// fullscreen preview. It is not re-created for the preview — same nodes, same
	// hover state, same zoom — so entering the preview never loses the folder the
	// reader was looking at.
	const drawing = (
				<GraphSvg
					ref={setSvgEl}
					$h={height}
					$full={full}
					$grow={growOnWide}
					// The viewport keeps the element's own shape (see `fit`), so
					// `meet` never letterboxes and screen↔graph is a plain ratio.
					viewBox={`${zoom.x} ${zoom.y} ${fit.w / zoom.s} ${fit.h / zoom.s}`}
					preserveAspectRatio="xMidYMid meet"
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerUp}
					// `max-width: 100%` + a FIXED height keep the drawing inside its
					// own cell: an SVG with only a viewBox still claims its intrinsic
					// size in a flex/grid track and would paint over the neighbour.
				>
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
				<g transform={`translate(${PAD_X},${PAD_Y})`}>
					{links.map(({ edge, path, lx, ly }, i) => {
						// A broken relation is the finding itself: an arrow that exists in
						// the code but NOT in the architecture. Drawn bright red, dashed and
						// labelled with a cross, so the wrong edge is the thing you see.
						const broken = edge.broken === true;
						const color = broken ? "#ff5c5c" : colorOf(edge.kind);
						const isActive = active === edge;
						const { kinds, via } = edgeLines(edge);
						const lines = [
							...kinds.map((k) => ({ text: broken ? `✕ ${k}` : k, fill: color })),
							...via.map((v) => ({ text: v, fill: "#56c8a8" })),
						];
						const pill = Math.max(...lines.map((l) => l.text.length * 5.4 + 10));
						// A label ON a box is unreadable: the layout places pills in free
						// space, and this is the guarantee, not the intention — whatever the
						// layout decides, a pill whose rectangle touches a box is not drawn.
						const overBox =
							lx != null &&
							[...positions.values()].some(
								(b) => lx - pill / 2 < b.x + b.w && lx + pill / 2 > b.x && ly - 8.5 < b.y + b.h && ly - 8.5 + lines.length * 11 + 2 > b.y,
							);
						return (
							<g key={`l${i}`} onMouseEnter={() => setHover(edge)} onMouseLeave={() => setHover(null)}>
								<path
									d={path}
									fill="none"
									stroke={color}
									strokeWidth={broken ? 3.2 : isActive ? 3 : 1.7}
									strokeOpacity={broken ? 1 : isActive ? 1 : 0.7}
									strokeDasharray={broken ? "7 5" : undefined}
									markerEnd={`url(#acc-arrow-${broken ? "broken" : edge.kind})`}
								/>
								{lx != null && !overBox ? (
									<>
										<rect x={lx - pill / 2} y={ly - 8.5} width={pill} height={lines.length * 11 + 2} rx={3} fill={broken ? "#2a0d0d" : "#0a0d13"} stroke={color} strokeOpacity={broken ? 0.95 : 0.4} />
										{lines.map((l, n) => (
											<text key={`${l.text}-${n}`} x={lx} y={ly + n * 11} fill={l.fill} fontSize="9" textAnchor="middle" fontFamily="monospace">
												{l.text}
											</text>
										))}
									</>
								) : null}
								<path d={path} fill="none" stroke="transparent" strokeWidth={14} />
							</g>
						);
					})}
					{drawNodes.map((n) => (
						<NodeBox
							key={n.slug}
							box={positions.get(n.slug)}
							node={n}
							active={focus === n.slug}
							mark={marks?.[n.slug] ?? null}
							loops={loopKinds.get(n.slug) ?? []}
							dashed={!n.fileCount}
							onMore={setPlacesFor}
							onClick={onFocus ? () => onFocus(focus === n.slug ? null : n.slug) : undefined}
						/>
					))}
				</g>
				</GraphSvg>

	);

	const toolbar = (
		<ZoomBar>
			<ZoomBtn type="button" title="Zoom out" onClick={() => zoomCentre(1 / ZOOM_STEP)} disabled={zoom.s <= ZOOM_MIN}>
				−
			</ZoomBtn>
			{/* The percentage is the third control: clicking it goes back to "fits",
			    which is what a reset is. One icon in the bar, and it is the one that
			    opens the preview — two expand-looking glyphs side by side read as the
			    same button twice. */}
			<Pct type="button" title="Fit the whole graph" onClick={() => setZoom(centred(1))} disabled={zoom.s === 1}>
				{Math.round(zoom.s * 100)}%
			</Pct>
			<ZoomBtn type="button" title="Zoom in" onClick={() => zoomCentre(ZOOM_STEP)} disabled={zoom.s >= ZOOM_MAX}>
				+
			</ZoomBtn>
			<ZoomBtn type="button" title={full ? "Leave the fullscreen preview (Esc)" : "Open the graph fullscreen"} onClick={() => setFull(!full)}>
				{full ? "✕" : "⛶"}
			</ZoomBtn>
		</ZoomBar>
	);

	// The full list of a role's places, ON the canvas: `+N more` used to open a
	// strip BELOW the drawing, out of sight, which read as a dead control.
	const placesPanel = placesNode ? (
		<PlacesPanel>
			<span style={{ color: "#6b7788" }}>
				{placesNode.places.length} places of {placesNode.name ?? placesNode.slug}:
			</span>
			{placesNode.places.map((place) => (
				<code key={place} style={{ color: "#8b9bb4" }}>
					{place}
				</code>
			))}
			<button
				type="button"
				onClick={() => setPlacesFor(null)}
				style={{ marginLeft: "auto", background: "transparent", border: "1px solid #2a3547", borderRadius: 6, color: "#8b9bb4", cursor: "pointer", padding: "1px 8px", font: "inherit" }}
			>
				close
			</button>
		</PlacesPanel>
	) : null;

	return (
		<div style={{ display: "grid", gap: 10 }}>
			{full ? (
				<Overlay>
					{/* The controls live in the HEADER, not floating over the canvas: an
					    absolutely-placed bar sits inside the drawing's own box, and a wide
					    graph pushes it past the right edge — the close button disappeared
					    exactly when the preview was fullscreen. In the header it cannot. */}
					<OverlayHead>
						<span style={{ color: "#c3ccd9" }}>
							{drawNodes.length} roles · {drawEdges.length} rules
						</span>
						<span>wheel = zoom · drag = move · Esc = close</span>
						<div style={{ marginLeft: "auto" }}>{toolbar}</div>
					</OverlayHead>
					<Canvas $panning={panning} style={{ flex: 1, minHeight: 0 }}>
						{drawing}
						{placesPanel}
					</Canvas>
				</Overlay>
			) : (
				<div style={{ position: "relative", minWidth: 0 }}>
					{toolbar}
					<Canvas $panning={panning}>
						{drawing}
						{placesPanel}
					</Canvas>
				</div>
			)}
			{active ? (
				<div style={{ fontSize: 12, fontFamily: "monospace", color: "#c3ccd9" }}>
					<span style={{ color: colorOf(active.kind) }}>{(active.kinds ?? [active.kind]).join(" · ")}</span>
					<span style={{ color: "#6b7788" }}> · </span>
					{active.actorPath && active.subjectPath ? (
						<>
							{active.actorPath} <span style={{ color: "#6b7788" }}>may {active.kind}</span> {active.subjectPath}
						</>
					) : (
						<>
							{active.fromPath} <span style={{ color: "#6b7788" }}>──▶</span> {active.toPath}
						</>
					)}
					{active.scope?.length ? (
						<span style={{ color: "#56c8a8" }}> · without an import, via {active.scope.join(" · ")}</span>
					) : null}
					{active.same ? <span style={{ color: "#f0a35e" }}> · same instance</span> : null}
				</div>
			) : (
				<div style={{ fontSize: 11.5, color: "#6b7788" }}>
					{drawNodes.length} roles · {drawEdges.length} rules
					{selfCount ? ` · ${selfCount} self-rule${selfCount === 1 ? "" : "s"} (↻ on the role)` : ""} — click a role for its boundary
				</div>
			)}
		</div>
	);
});
