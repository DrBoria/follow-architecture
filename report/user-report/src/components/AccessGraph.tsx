// A folder-access graph: the boxes are the DECLARED nodes, the arrows are the
// actions the architecture allows between them (`import`, `usage`, `mutation`
// or whatever the config named). Nothing here knows a kind by name — the
// colours come from the caller, indexed by the config's own action order.
//
// The drawing is ONE element used in two places (the inline panel and the
// fullscreen preview): same nodes, same hover, same zoom — entering the preview
// never loses the folder the reader was looking at. The pieces live in
// `access-graph/`; this component is the state and the assembly.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { buildGraph, visibleSlugs, type LayoutNode, type LayoutEdge, type Box, type Link } from "../utils/layout";
import { Canvas, GraphSvg, Overlay, OverlayHead } from "./access-graph/styles";
import { NodeBox, type Loop } from "./access-graph/NodeBox";
import { EdgeLayer, ArrowDefs } from "./access-graph/EdgeLayer";
import { Toolbar, PlacesOverlay, HoverLine, StatusLine } from "./access-graph/Overlays";
import { loopKindsOf } from "./access-graph/loops";
import { useZoomPan, type ZoomPan } from "./access-graph/useZoomPan";
import type { Mark } from "../graph/representation/contract";

const PAD_X = 20;
const PAD_Y = 16;

type AccessGraphProps = {
	nodes: LayoutNode[];
	edges: LayoutEdge[];
	kindColors: Record<string, string>;
	focus?: string | null;
	onFocus?: ((slug: string | null) => void) | null;
	height?: number;
	showAll?: boolean;
	growOnWide?: boolean;
	marks?: Record<string, Mark>;
	keep?: string[];
};

// What the drawing reads beyond the scene: the visible boxes, the layout, the
// zoom state, and the hover/places setters.
type DrawingAsk = {
	scene: AccessGraphProps;
	drawNodes: LayoutNode[];
	loopKinds: Map<string, Loop[]>;
	zp: ZoomPan;
	full: boolean;
	hover: LayoutEdge | null;
	setHover: (e: LayoutEdge | null) => void;
	setPlacesFor: (slug: string | null) => void;
	positions: Map<string, Box>;
	links: Link[];
};

// The drawing itself: the SVG with its markers, arrows and boxes.
const Drawing = ({ scene, drawNodes, loopKinds, zp, full, hover, setHover, setPlacesFor, positions, links }: DrawingAsk): React.JSX.Element => {
	const { kindColors, focus, onFocus, height = 320, growOnWide = false, marks = {} } = scene;
	const colorOf = (kind: string): string => kindColors?.[kind] ?? "#7d8899";
	return (
		<GraphSvg
			ref={zp.setSvgEl}
			$h={height}
			$full={full}
			$grow={growOnWide}
			viewBox={`${zp.zoom.x} ${zp.zoom.y} ${zp.fit.w / zp.zoom.s} ${zp.fit.h / zp.zoom.s}`}
			preserveAspectRatio="xMidYMid meet"
			onPointerDown={zp.onPointerDown}
			onPointerMove={zp.onPointerMove}
			onPointerUp={zp.onPointerUp}
			onPointerCancel={zp.onPointerUp}
		>
			<ArrowDefs kindColors={kindColors ?? {}} />
			<g transform={`translate(${PAD_X},${PAD_Y})`}>
				<EdgeLayer links={links} positions={positions} colorOf={colorOf} active={hover} onHover={setHover} />
				{drawNodes.map((n) => (
					<NodeBox
						key={n.slug}
						box={positions.get(n.slug) ?? { x: 0, y: 0, w: 0, h: 0 }}
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
};

// Memoised: the layout is `buildGraph` over every visible node and edge, and a
// parent that re-renders on each keystroke must not pay for it.
const AccessGraph = React.memo(function AccessGraph(scene: AccessGraphProps): React.JSX.Element {
	const { nodes, edges, kindColors, focus = null, height = 320, showAll = false, keep = [] } = scene;
	const [hover, setHover] = useState<LayoutEdge | null>(null);
	const [placesFor, setPlacesFor] = useState<string | null>(null);
	const [full, setFull] = useState(false);

	// Self-relations are badges on the box, so the canvas keeps only arrows
	// between different folders.
	const drawEdges = useMemo(() => edges.filter((e) => e.from !== e.to), [edges]);
	const loopKinds = useMemo(() => loopKindsOf(edges), [edges]);
	const visible = useMemo(() => visibleSlugs({ nodes, edges, focus, showAll, keep }), [nodes, edges, focus, showAll, keep]);
	const drawNodes = useMemo(() => nodes.filter((n) => visible.has(n.slug)), [nodes, visible]);
	const loopsOf = useCallback((slug: string): number => loopKinds.get(slug)?.length ?? 0, [loopKinds]);
	const { positions, width, height: h, links } = useMemo(() => buildGraph(drawNodes, drawEdges, { loopsOf }), [drawNodes, drawEdges, loopsOf]);
	const selfCount = useMemo(() => edges.filter((e) => e.from === e.to).length, [edges]);
	const colorOf = (kind: string): string => kindColors?.[kind] ?? "#7d8899";
	const placesNode = useMemo(() => (placesFor ? drawNodes.find((n) => n.slug === placesFor) ?? null : null), [placesFor, drawNodes]);

	const fullW = width + PAD_X * 2;
	const fullH = Math.max(h, height) + PAD_Y * 2;
	const zp = useZoomPan({ fullW, fullH, relayoutKey: `${drawNodes.length}:${width}:${h}:${full}` });

	// Esc leaves the preview: the one key a full-window layer must answer.
	useEffect(() => {
		if (!full) return undefined;
		const onKey = (event: KeyboardEvent): void => {
			if (event.key === "Escape") setFull(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [full]);

	const drawing = (
		<Drawing scene={scene} drawNodes={drawNodes} loopKinds={loopKinds} zp={zp} full={full} hover={hover} setHover={setHover} setPlacesFor={setPlacesFor} positions={positions} links={links} />
	);
	const toolbar = <Toolbar zoom={zp.zoom} full={full} onZoom={zp.zoomCentre} onFit={() => zp.setZoom(zp.centred(1))} onFull={() => setFull(!full)} />;
	const placesPanel = placesNode ? <PlacesOverlay node={placesNode} onClose={() => setPlacesFor(null)} /> : null;

	return (
		<div style={{ display: "grid", gap: 10 }}>
			{full ? (
				<Overlay>
					<OverlayHead>
						<span style={{ color: "#c3ccd9" }}>
							{drawNodes.length} roles · {drawEdges.length} rules
						</span>
						<span>wheel = zoom · drag = move · Esc = close</span>
						<div style={{ marginLeft: "auto" }}>{toolbar}</div>
					</OverlayHead>
					<Canvas $panning={zp.panning} style={{ flex: 1, minHeight: 0 }}>
						{drawing}
						{placesPanel}
					</Canvas>
				</Overlay>
			) : (
				<div style={{ position: "relative", minWidth: 0 }}>
					{toolbar}
					<Canvas $panning={zp.panning}>
						{drawing}
						{placesPanel}
					</Canvas>
				</div>
			)}
			{hover ? <HoverLine edge={hover} colorOf={colorOf} /> : <StatusLine nodeCount={drawNodes.length} edgeCount={drawEdges.length} selfCount={selfCount} />}
		</div>
	);
});

export { AccessGraph };
export type { AccessGraphProps };
