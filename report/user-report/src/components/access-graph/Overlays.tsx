"use strict";

// The canvas's small overlays: the zoom bar (out / fit / in / fullscreen), the
// opened place list, and the hover/status line under the drawing.

import React from "react";
import { ZoomBar, ZoomBtn, Pct, PlacesPanel } from "./styles";
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, type View } from "./useZoomPan";
import type { LayoutNode, LayoutEdge } from "../../utils/layout";

// The zoom controls. The percentage is the fit button; the one expand glyph
// opens the fullscreen preview.
const Toolbar = ({ zoom, full, onZoom, onFit, onFull }: { zoom: View; full: boolean; onZoom: (factor: number) => void; onFit: () => void; onFull: () => void }): React.JSX.Element => (
	<ZoomBar>
		<ZoomBtn type="button" title="Zoom out" onClick={() => onZoom(1 / ZOOM_STEP)} disabled={zoom.s <= ZOOM_MIN}>
			−
		</ZoomBtn>
		<Pct type="button" title="Fit the whole graph" onClick={onFit} disabled={zoom.s === 1}>
			{Math.round(zoom.s * 100)}%
		</Pct>
		<ZoomBtn type="button" title="Zoom in" onClick={() => onZoom(ZOOM_STEP)} disabled={zoom.s >= ZOOM_MAX}>
			+
		</ZoomBtn>
		<ZoomBtn type="button" title={full ? "Leave the fullscreen preview (Esc)" : "Open the graph fullscreen"} onClick={onFull}>
			{full ? "✕" : "⛶"}
		</ZoomBtn>
	</ZoomBar>
);

// The full list of a role's places, ON the canvas: `+N more` opens it here, not
// in a strip below the drawing out of sight.
const PlacesOverlay = ({ node, onClose }: { node: LayoutNode; onClose: () => void }): React.JSX.Element => (
	<PlacesPanel>
		<span style={{ color: "#6b7788" }}>
			{(node.places ?? []).length} places of {node.name ?? node.slug}:
		</span>
		{(node.places ?? []).map((place) => (
			<code key={place} style={{ color: "#8b9bb4" }}>
				{place}
			</code>
		))}
		<button
			type="button"
			onClick={onClose}
			style={{ marginLeft: "auto", background: "transparent", border: "1px solid #2a3547", borderRadius: 6, color: "#8b9bb4", cursor: "pointer", padding: "1px 8px", font: "inherit" }}
		>
			close
		</button>
	</PlacesPanel>
);

// The hovered edge's statement: who may do what to whom, and how the code is
// reached without an import.
const HoverLine = ({ edge, colorOf }: { edge: LayoutEdge; colorOf: (kind: string) => string }): React.JSX.Element => (
	<div style={{ fontSize: 12, fontFamily: "monospace", color: "#c3ccd9" }}>
		<span style={{ color: colorOf(edge.kind) }}>{(edge.kinds ?? [edge.kind]).join(" · ")}</span>
		<span style={{ color: "#6b7788" }}> · </span>
		{edge.actorPath && edge.subjectPath ? (
			<>
				{edge.actorPath} <span style={{ color: "#6b7788" }}>may {edge.kind}</span> {edge.subjectPath}
			</>
		) : (
			<>
				{edge.fromPath} <span style={{ color: "#6b7788" }}>──▶</span> {edge.toPath}
			</>
		)}
		{edge.scope?.length ? <span style={{ color: "#56c8a8" }}> · without an import, via {edge.scope.join(" · ")}</span> : null}
		{edge.same ? <span style={{ color: "#f0a35e" }}> · same instance</span> : null}
	</div>
);

// The status line when nothing is hovered: the counts and the self-rule note.
const StatusLine = ({ nodeCount, edgeCount, selfCount }: { nodeCount: number; edgeCount: number; selfCount: number }): React.JSX.Element => (
	<div style={{ fontSize: 11.5, color: "#6b7788" }}>
		{nodeCount} roles · {edgeCount} rules
		{selfCount ? ` · ${selfCount} self-rule${selfCount === 1 ? "" : "s"} (↻ on the role)` : ""} — click a role for its boundary
	</div>
);

export { Toolbar, PlacesOverlay, HoverLine, StatusLine };
