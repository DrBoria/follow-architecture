"use strict";

// ZOOM AND PAN. The canvas is a VIEWPORT onto the graph: the `viewBox` is the
// rectangle of graph space currently on screen. Zooming shrinks that rectangle,
// panning moves it — one coordinate system, so labels, arrow widths and gaps
// scale together and nothing can drift out of alignment. The rectangle always
// has the element's own aspect ratio, which is what makes "zoom where the
// cursor is" exact.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Box } from "../../utils/layout";

// Zoom limits: 1 = the whole graph fits, 12 = one folder name is readable.
const ZOOM_MIN = 1;
const ZOOM_MAX = 12;
const ZOOM_STEP = 1.35;

// The viewport: a scale and the graph-space origin of its top-left corner.
type View = { s: number; x: number; y: number };

// The element's pixel size (measured, not assumed: the panel is a grid cell).
// The same width/height pair a placed box carries — DERIVED, never re-spelled.
type Size = Pick<Box, "w" | "h">;

// The graph rectangle that fits the whole drawing at the element's aspect ratio.
const fitOf = (box: Size, fullW: number, fullH: number): Size => {
	const ratio = box.w && box.h ? box.h / box.w : 0;
	const w = ratio ? Math.max(fullW, fullH / ratio) : fullW;
	return { w, h: ratio ? w * ratio : fullH };
};

// A viewport wider than the drawing stays centred; otherwise it stays inside.
// Both cases are the same interval with its bounds swapped — one clamp covers them.
const clampOf = (ask: { view: View; viewW: number; viewH: number; fullW: number; fullH: number }): View => {
	const { view, viewW, viewH, fullW, fullH } = ask;
	return {
		s: view.s,
		x: Math.min(Math.max(view.x, Math.min(0, fullW - viewW)), Math.max(0, fullW - viewW)),
		y: Math.min(Math.max(view.y, Math.min(0, fullH - viewH)), Math.max(0, fullH - viewH)),
	};
};

// What the hook answers: the current view, the fit rectangle, the element
// setter, the pan state, and the zoom/pan controls.
type ZoomPan = {
	zoom: View;
	fit: Size;
	setSvgEl: (el: SVGSVGElement | null) => void;
	panning: boolean;
	centred: (s: number) => View;
	setZoom: (v: View) => void;
	zoomAt: (factor: number, clientX: number, clientY: number) => void;
	zoomCentre: (factor: number) => void;
	onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
	onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void;
	onPointerUp: () => void;
};

// The drag state: a pointer capture while zoomed, and the pan it produces.
type Drag = { x: number; y: number; vx: number; vy: number; moved: boolean };

// Screen pixels → graph units: a drag of half the panel moves half the view.
const panDelta = (ask: { d: Drag; clientX: number; clientY: number; rect: DOMRect; viewW: number; viewH: number }): { dx: number; dy: number } => {
	const { d, clientX, clientY, rect, viewW, viewH } = ask;
	return { dx: ((clientX - d.x) / rect.width) * viewW, dy: ((clientY - d.y) / rect.height) * viewH };
};

const useDragPan = (ask: { zoom: View; fit: Size; svgEl: SVGSVGElement | null; clampPan: (v: View, w: number, h: number) => View; setZoom: (fn: (v: View) => View) => void }): { panning: boolean; onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void; onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void; onPointerUp: () => void } => {
	const { zoom, fit, svgEl, clampPan, setZoom } = ask;
	const drag = useRef<Drag | null>(null);
	const [panning, setPanning] = useState(false);

	const onPointerDown = (event: React.PointerEvent<SVGSVGElement>): void => {
		if (zoom.s <= 1) return;
		drag.current = { x: event.clientX, y: event.clientY, vx: zoom.x, vy: zoom.y, moved: false };
		event.currentTarget.setPointerCapture?.(event.pointerId);
		setPanning(true);
	};
	// The pan one move produces: the drag's origin minus the pixel delta in graph units.
	const movedView = (d: Drag, event: React.PointerEvent<SVGSVGElement>, rect: DOMRect): View => {
		const viewW = fit.w / zoom.s;
		const viewH = fit.h / zoom.s;
		const { dx, dy } = panDelta({ d, clientX: event.clientX, clientY: event.clientY, rect, viewW, viewH });
		if (Math.abs(event.clientX - d.x) > 2 || Math.abs(event.clientY - d.y) > 2) d.moved = true;
		return clampPan({ s: zoom.s, x: d.vx - dx, y: d.vy - dy }, viewW, viewH);
	};
	const onPointerMove = (event: React.PointerEvent<SVGSVGElement>): void => {
		const d = drag.current;
		const rect = svgEl?.getBoundingClientRect();
		const ready = Boolean(d) && Boolean(rect?.width);
		if (ready && d && rect) setZoom(() => movedView(d, event, rect));
	};
	const onPointerUp = (): void => {
		drag.current = null;
		setPanning(false);
	};
	return { panning, onPointerDown, onPointerMove, onPointerUp };
};

const useZoomPan = (ask: { fullW: number; fullH: number; relayoutKey: string }): ZoomPan => {
	const { fullW, fullH, relayoutKey } = ask;
	const [zoom, setZoom] = useState<View>({ s: 1, x: 0, y: 0 });
	const [box, setBox] = useState<Size>({ w: 0, h: 0 });
	const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(null);

	// The element's pixel size decides the viewport's shape.
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

	// MEMOISED: `centred` depends on `fit`, and the "new drawing starts at fit"
	// effect depends on `centred`. A fresh `fit` object every render would make
	// that effect run on every render and reset the zoom immediately after each
	// interaction — the +/- buttons and the wheel would look dead.
	const fit = useMemo(() => fitOf(box, fullW, fullH), [box, fullW, fullH]);
	const clampPan = useCallback((view: View, viewW: number, viewH: number): View => clampOf({ view, viewW, viewH, fullW, fullH }), [fullW, fullH]);
	const centred = useCallback((s: number): View => clampPan({ s, x: (fullW - fit.w / s) / 2, y: (fullH - fit.h / s) / 2 }, fit.w / s, fit.h / s), [clampPan, fit, fullW, fullH]);

	// A re-laid-out graph is a different drawing: the view starts again at "fits".
	useEffect(() => setZoom(centred(1)), [centred, relayoutKey]);

	// Zoom around a POINT (the cursor): the graph coordinate under it stays under it.
	const zoomAt = useCallback(
		(factor: number, clientX: number, clientY: number): void => {
			const rect = svgEl?.getBoundingClientRect();
			setZoom((view) => {
				const s = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, view.s * factor));
				if (s === view.s) return view;
				const viewW = fit.w / s;
				const viewH = fit.h / s;
				const u = rect?.width ? (clientX - rect.left) / rect.width : 0.5;
				const v = rect?.height ? (clientY - rect.top) / rect.height : 0.5;
				const gx = view.x + u * (fit.w / view.s);
				const gy = view.y + v * (fit.h / view.s);
				return clampPan({ s, x: gx - u * viewW, y: gy - v * viewH }, viewW, viewH);
			});
		},
		[clampPan, fit, svgEl],
	);

	const zoomCentre = useCallback(
		(factor: number): void => {
			const rect = svgEl?.getBoundingClientRect();
			zoomAt(factor, rect ? rect.left + rect.width / 2 : 0, rect ? rect.top + rect.height / 2 : 0);
		},
		[zoomAt, svgEl],
	);

	// A wheel over the canvas zooms; the listener is native (React's onWheel is
	// passive in some builds, and preventDefault there would be ignored).
	useEffect(() => {
		const el = svgEl;
		if (!el) return undefined;
		const onWheel = (event: WheelEvent): void => {
			event.preventDefault();
			zoomAt(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, event.clientX, event.clientY);
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, [zoomAt, svgEl]);

	const dragPan = useDragPan({ zoom, fit, svgEl, clampPan, setZoom });

	return { zoom, fit, setSvgEl, centred, setZoom, zoomAt, zoomCentre, ...dragPan };
};

export { useZoomPan, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP };
export type { View, ZoomPan };
