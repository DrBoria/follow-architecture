// Graph layout for the import map.
//
// Two decisions make the picture readable:
//
// 1. Layers are derived from the EDGES, not from the declared tree depth.
//    A node sits at `max(predecessor rank) + 1`, so every arrow spans exactly
//    one column. Using tree depth produced arrows that jumped over a whole
//    column of boxes — the "something scribbled" look.
// 2. Every edge gets its own port on the box edge, spread evenly, so several
//    arrows between the same pair never leave from the same pixel.
// 3. Vertical runs only ever happen in the empty strips between columns, and
//    horizontal runs only in the lanes outside the band of boxes, so an arrow
//    cannot pass under a box.

// Sized so four columns fit a normal side panel; the canvas scales to the
// panel width, so nothing is ever cut in half at the edge.
export const COL = { width: 200, gapX: 92, row: 70, gapY: 46 };
// Room for one arrow lane outside the band of boxes, plus breathing space.
const LANE = 18;
const PAD = 14;

export const computeDepths = (nodes) => {
	const bySlug = new Map(nodes.map((n) => [n.slug, n]));
	const depth = new Map();
	const visiting = new Set();

	const resolve = (slug) => {
		if (depth.has(slug)) return depth.get(slug);
		if (visiting.has(slug)) return 0;
		visiting.add(slug);
		const node = bySlug.get(slug);
		const parents = (node?.parents ?? []).filter((p) => bySlug.has(p));
		const d = parents.length ? Math.max(...parents.map(resolve)) + 1 : 0;
		visiting.delete(slug);
		depth.set(slug, d);
		return d;
	};

	for (const n of nodes) resolve(n.slug);
	return { depth, bySlug };
};

// Rank by longest path over the drawn edges; isolated nodes fall back to the
// declared tree depth so they still land somewhere sensible.
const ranksFromEdges = (nodes, edges) => {
	const incoming = new Map(nodes.map((n) => [n.slug, []]));
	for (const e of edges) {
		if (e.from && e.to && e.from !== e.to && incoming.has(e.to)) incoming.get(e.to).push(e.from);
	}
	const { depth } = computeDepths(nodes);
	const rank = new Map();
	const visiting = new Set();

	const resolve = (slug) => {
		if (rank.has(slug)) return rank.get(slug);
		if (visiting.has(slug)) return 0;
		visiting.add(slug);
		const preds = incoming.get(slug) ?? [];
		const value = preds.length ? Math.max(...preds.map(resolve)) + 1 : depth.get(slug) ?? 0;
		visiting.delete(slug);
		rank.set(slug, value);
		return value;
	};

	for (const n of nodes) resolve(n.slug);

	const min = Math.min(...rank.values());
	if (min > 0) for (const [k, v] of rank) rank.set(k, v - min);
	return rank;
};

// Barycenter pass: put each node near the average row of its predecessors.
const orderColumns = (columns, edges) => {
	const neighbours = new Map();
	for (const { from, to } of edges) {
		if (!from || !to || from === to) continue;
		if (!neighbours.has(to)) neighbours.set(to, []);
		neighbours.get(to).push(from);
	}

	for (let pass = 0; pass < 3; pass += 1) {
		for (const [, list] of [...columns].sort((a, b) => a[0] - b[0])) {
			const indexOf = new Map(list.map((n, i) => [n.slug, i]));
			const bary = (n) => {
				const rows = (neighbours.get(n.slug) ?? []).map((p) => indexOf.get(p)).filter((v) => v != null);
				return rows.length ? rows.reduce((s, v) => s + v, 0) / rows.length : indexOf.get(n.slug);
			};
			list.sort((a, b) => bary(a) - bary(b));
		}
	}
	return columns;
};


// What is written on an arrow, line by line: one action per line (a merged pair
// carries several), then HOW the same code may be reached without an import —
// `getRoot(…)`, `getParent(…)` and the rest of the role's `scopeAccess`. Two
// chains per line keeps the pill narrow enough to live in a column strip.
export const edgeLines = (edge) => {
	const kinds = (edge.kinds ?? [edge.kind]).map(String);
	const scope = edge.scope ?? [];
	if (!scope.length) return { kinds, via: [] };
	// The prefix is part of the TEXT, not of the renderer: the pill's width is
	// measured from these strings, and a label the layout thinks is narrower than
	// it is drawn is exactly how a pill ends up on top of an arrow.
	const via = [];
	for (let i = 0; i < scope.length; i += 3) {
		const chunk = scope.slice(i, i + 3).join(", ");
		via.push(i === 0 ? `via ${chunk}` : chunk);
	}
	return { kinds, via };
};

const CHAR_W = 5.4;
const LINE_H = 11;
const labelWidth = (text) => String(text ?? "").length * CHAR_W + 10;
// The widest line decides the pill's width; the number of lines its height.
const pillSize = (edge) => {
	const { kinds, via } = edgeLines(edge);
	const lines = [...kinds, ...via];
	return { w: Math.max(...lines.map(labelWidth)), h: lines.length * LINE_H + 2, count: lines.length };
};

// A path through the given corners, with the corners rounded so an arrow reads
// as a curve instead of a wire diagram. Points are kept on the link so a test
// (or a reader) can verify that no segment crosses a box.
const rounded = (points, r = 11) => {
	let d = `M${points[0][0]},${points[0][1]}`;
	for (let i = 1; i < points.length - 1; i += 1) {
		const [px, py] = points[i - 1];
		const [cx, cy] = points[i];
		const [nx, ny] = points[i + 1];
		const inLen = Math.hypot(cx - px, cy - py);
		const outLen = Math.hypot(nx - cx, ny - cy);
		const rr = Math.min(r, inLen / 2, outLen / 2);
		if (rr < 0.5) {
			d += ` L${cx},${cy}`;
			continue;
		}
		const ax = cx - ((cx - px) / (inLen || 1)) * rr;
		const ay = cy - ((cy - py) / (inLen || 1)) * rr;
		const bx = cx + ((nx - cx) / (outLen || 1)) * rr;
		const by = cy + ((ny - cy) / (outLen || 1)) * rr;
		d += ` L${ax},${ay} Q${cx},${cy} ${bx},${by}`;
	}
	const last = points[points.length - 1];
	return `${d} L${last[0]},${last[1]}`;
};

export const buildGraph = (nodes, edges, options = {}) => {
	const rank = ranksFromEdges(nodes, edges);
	const columns = new Map();
	for (const n of nodes) {
		const r = rank.get(n.slug) ?? 0;
		if (!columns.has(r)) columns.set(r, []);
		columns.get(r).push(n);
	}
	for (const list of columns.values()) list.sort((a, b) => a.slug.localeCompare(b.slug));
	orderColumns(columns, edges);

	const drawable = edges.filter((e) => e.from && e.to && e.from !== e.to && nodes.some((n) => n.slug === e.from) && nodes.some((n) => n.slug === e.to));

	// Route is decided BEFORE anything is positioned, because the number of
	// lanes needed above and below the band depends on it.
	//
	//   gap     — next column over: the arrow lives entirely in the empty strip
	//             between the two columns.
	//   channel — anything else: it runs outside the band, in a lane of its own.
	//             A backward edge is lifted over the top; a long forward jump
	//             drops under the bottom. Both enter and leave their boxes
	//             horizontally, so the vertical run always happens in a column
	//             strip, where no box can be in the way.
	const plans = drawable.map((edge) => {
		const ca = rank.get(edge.from) ?? 0;
		const cb = rank.get(edge.to) ?? 0;
		const forward = cb > ca;
		// One column over, either way: the arrow belongs in the empty strip that
		// separates the two columns. Only a jump over a column needs a channel.
		const side = cb === ca + 1 ? "gap" : cb === ca - 1 ? "gap-back" : forward ? "below" : "above";
		return { edge, ca, cb, forward, side };
	});

	// The strip between two columns is where an arrow's label lives, so it must
	// be wide enough for the widest one: `call` + `via getRoot(…), getParent(…)`
	// is several times wider than the bare action name.
	const gap = Math.max(COL.gapX, ...plans.map((p) => pillSize(p.edge).w + 26));

	const above = plans.filter((p) => p.side === "above");
	const below = plans.filter((p) => p.side === "below");
	// Longest edges get the outermost lane: they have the farthest to travel and
	// are the ones that would otherwise cut across a short arrow's lane.
	const bySpan = (a, b) => Math.abs(b.cb - b.ca) - Math.abs(a.cb - a.ca);
	above.sort(bySpan);
	below.sort(bySpan);
	above.forEach((p, i) => {
		p.lane = PAD + i * LANE;
	});
	below.forEach((p, i) => {
		p.lane = i * LANE;
	});

	// A label is drawn next to a horizontal run, above or below it; the tallest
	// pill therefore needs that much free space at the top and the bottom of the
	// picture, or the placement has nowhere legal to put it.
	const labelPad = plans.length ? Math.max(...plans.map((p) => pillSize(p.edge).h)) + 14 : 0;
	const topSpace = Math.max(above.length ? PAD * 2 + (above.length - 1) * LANE : PAD, labelPad);
	const bottomSpace = Math.max(below.length ? PAD * 2 + (below.length - 1) * LANE : PAD, labelPad);

	// A label sits ABOVE the arrow it names, never on top of it. That needs
	// vertical room: the ports on one side of a box must be at least a label
	// apart, so a box with five arrows leaving it is TALLER than one with two.
	// The alternative is what used to happen — labels pushed onto the wires
	// because there was nowhere else to put them.
	const touching = new Map();
	for (const p of plans) {
		for (const slug of [p.edge.from, p.edge.to]) if (!touching.has(slug)) touching.set(slug, 0);
		touching.set(p.edge.from, touching.get(p.edge.from) + 1);
		if (p.edge.to !== p.edge.from) touching.set(p.edge.to, touching.get(p.edge.to) + 1);
	}
	const labelH = plans.length ? Math.max(...plans.map((p) => pillSize(p.edge).h)) : 12;
	const heightOf = (slug) => {
		const n = touching.get(slug) ?? 0;
		const needed = (n + 1) * (labelH + 12) - 12;
		return Math.max(COL.row, Math.min(needed, 420));
	};

	const positions = new Map();
	const columnHeights = new Map();
	for (const [r, list] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
		const totalH = list.reduce((sum, n) => sum + heightOf(n.slug), 0) + (list.length - 1) * COL.gapY;
		columnHeights.set(r, totalH);
	}
	const band = Math.max(...columnHeights.values(), COL.row);
	const top = topSpace;
	for (const [r, list] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
		const startY = top + (band - columnHeights.get(r)) / 2;
		let cursor = startY;
		for (const n of list) {
			const h = heightOf(n.slug);
			positions.set(n.slug, { x: r * (COL.width + gap), y: cursor, w: COL.width, h });
			cursor += h + COL.gapY;
		}
	}

	// Ports: every arrow gets its own pixel on the box side it uses, ordered by
	// where it is heading, so two arrows never leave from the same point.
	// Ports: every arrow gets its own pixel on the box side it uses, ordered by
	// where it is heading, so two arrows never leave from the same point.
	const portGroups = new Map();
	const groupOf = (slug, side, edge) => {
		const key = `${slug}|${side}`;
		if (!portGroups.has(key)) portGroups.set(key, []);
		const list = portGroups.get(key);
		if (!list.includes(edge)) list.push(edge);
		return list;
	};
	for (const p of plans) {
		groupOf(p.edge.from, p.forward ? "right" : "left", p.edge);
		groupOf(p.edge.to, p.forward ? "left" : "right", p.edge);
	}
	const portY = (slug, side, edge, other) => {
		const box = positions.get(slug);
		const list = (portGroups.get(`${slug}|${side}`) ?? []).slice().sort((a, b) => {
			const oa = positions.get(a === edge ? other : a.from === slug ? a.to : a.from)?.y ?? 0;
			const ob = positions.get(b === edge ? other : b.from === slug ? b.to : b.from)?.y ?? 0;
			return oa - ob;
		});
		const i = Math.max(list.indexOf(edge), 0);
		return box.y + (box.h * (i + 1)) / (list.length + 1);
	};

	const bottomLaneY = top + band + PAD;
	// One counter for EVERY vertical run, keyed by the strip it stands in: two
	// arrows — of the same action or of different ones — never share a vertical
	// line, so a green `call` and a blue `import` can never look like one arrow.
	const lanes = new Map();
	const laneAt = (base, dir, key) => {
		const n = lanes.get(key) ?? 0;
		lanes.set(key, n + 1);
		return base + dir * (gap * 0.15 + n * 9);
	};
	const links = plans.map((p) => {
		const a = positions.get(p.edge.from);
		const b = positions.get(p.edge.to);
		const exitX = p.forward ? a.x + a.w : a.x;
		const entryX = p.forward ? b.x : b.x + b.w;
		const y1 = portY(p.edge.from, p.forward ? "right" : "left", p.edge, p.edge.to);
		const y2 = portY(p.edge.to, p.forward ? "left" : "right", p.edge, p.edge.from);
		const vOut = laneAt(exitX, p.forward ? 1 : -1, `out|${Math.round(exitX)}`);

		let points;
		if (p.side === "gap" || p.side === "gap-back") {
			// One column over: the arrow turns onto its own vertical in the strip
			// and comes out straight into the next box.
			points = [
				[exitX, y1],
				[vOut, y1],
				[vOut, y2],
				[entryX, y2],
			];
		} else {
			const vIn = laneAt(entryX, p.forward ? -1 : 1, `in|${Math.round(entryX)}`);
			const laneY = p.side === "above" ? p.lane : bottomLaneY + p.lane;
			points = [
				[exitX, y1],
				[vOut, y1],
				[vOut, laneY],
				[vIn, laneY],
				[vIn, y2],
				[entryX, y2],
			];
		}
		return { edge: p.edge, kind: p.side, points, path: rounded(points) };
	});

	const cols = Math.max(...[...columns.keys()], 0) + 1;
	const width = cols * (COL.width + gap) - gap;
	const height = top + band + bottomSpace;
	// A label is a pill ON its own arrow, so it is placed, not guessed: near one
	// of its horizontal runs, at a spot where the pill touches no box, no other
	// arrow and no other label. When the obvious spots are taken (two arrows
	// leaving the same box share a strip), the search widens to the arrow's whole
	// span — a floating label is better than a missing one, and it is never on
	// top of anything.
	const hitsRect = (seg, r) => {
		const xm = Math.min(seg[0][0], seg[1][0]) - 1.5;
		const xM = Math.max(seg[0][0], seg[1][0]) + 1.5;
		const ym = Math.min(seg[0][1], seg[1][1]) - 1.5;
		const yM = Math.max(seg[0][1], seg[1][1]) + 1.5;
		return xM > r.x && xm < r.x + r.w && yM > r.y && ym < r.y + r.h;
	};
	const boxes = [...positions.values()];
	const taken = [];
	const free = (rect, others, self) =>
		!boxes.some((b) => rect.x + rect.w > b.x && rect.x < b.x + b.w && rect.y + rect.h > b.y && rect.y < b.y + b.h) &&
		!others.some((seg) => hitsRect(seg, rect)) &&
		// Not on its OWN line either: the label belongs above or below the arrow
		// it names, never struck through by it.
		!self.some((seg) => hitsRect(seg, rect)) &&
		!taken.some((o) => rect.x + rect.w > o.x && rect.x < o.x + o.w && rect.y + rect.h > o.y && rect.y < o.y + o.h);

	for (const l of links) {
		const { w: pill, h: tall } = pillSize(l.edge);
		const xs = l.points.map((pt) => pt[0]);
		const lo = Math.min(...xs) + pill / 2 + 2;
		const hi = Math.max(...xs) - pill / 2 - 2;
		const others = links.filter((o) => o !== l).flatMap((o) => o.points.slice(0, -1).map((pt, i) => [pt, o.points[i + 1]]));
		const self = l.points.slice(0, -1).map((pt, i) => [pt, l.points[i + 1]]);
		let found = null;

		if (hi > lo) {
			// 1. hugging one of its own horizontal runs, above it first
			const runs = l.points.filter((pt, i) => i < l.points.length - 1 && Math.abs(l.points[i + 1][1] - pt[1]) < 0.5).map((pt) => pt[1]);
			const mid = (lo + hi) / 2;
			const step = Math.max(1, (hi - lo) / 16);
			for (const y of [...new Set(runs)]) {
				for (let k = 0; k <= 16 && !found; k += 1) {
					const cx = mid + (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * step;
					if (cx < lo - 0.5 || cx > hi + 0.5) continue;
					for (const top of [y - 4 - tall, y + 4]) {
						const rect = { x: cx - pill / 2, y: top, w: pill, h: tall };
						if (rect.y < 3 || rect.y + rect.h > height - 2) continue;
						if (free(rect, others, self)) {
							found = { cx, rect };
							break;
						}
					}
				}
				if (found) break;
			}
		}

		if (!found) {
			// 2. anywhere at all, nearest to the arrow first: when a strip already
			// holds another arrow's vertical run, no slot inside it is free, and a
			// label a little to the side is better than no label on the picture.
			const runs = l.points.filter((pt, i) => i < l.points.length - 1 && Math.abs(l.points[i + 1][1] - pt[1]) < 0.5).map((pt) => pt[1]);
			const cx0 = (Math.min(...xs) + Math.max(...xs)) / 2;
			const cost = (rect) => {
				const dy = runs.length ? Math.min(...runs.map((y) => Math.abs(rect.y + tall / 2 - y))) : 0;
				const dx = Math.abs(rect.x + rect.w / 2 - cx0);
				return dy * 2 + dx;
			};
			const slots = [];
			for (let top = 3; top + tall <= height - 2; top += 4) {
				for (let cx = pill / 2 + 2; cx <= width - pill / 2 - 2; cx += 4) slots.push({ cx, rect: { x: cx - pill / 2, y: top, w: pill, h: tall } });
			}
			slots.sort((a, b) => cost(a.rect) - cost(b.rect));
			for (const slot of slots) {
				if (free(slot.rect, others, self)) {
					found = slot;
					break;
				}
			}
		}

		if (found) {
			l.lx = found.cx;
			l.ly = found.rect.y + 8.5;
			taken.push(found.rect);
		}
	}

	return { positions, width, height, columns, links, loops: [], rank };
};

// Nodes worth drawing: everything touched by an edge, plus the focus and its
// neighbours (so selecting a node never leaves it stranded).
export const visibleSlugs = ({ edges, focus, showAll, nodes }) => {
	if (showAll) return new Set(nodes.map((n) => n.slug));
	const keep = new Set();
	for (const e of edges) {
		if (!e.from || !e.to) continue;
		keep.add(e.from);
		keep.add(e.to);
	}
	if (focus) {
		keep.add(focus);
		for (const e of edges) {
			if (e.from === focus) keep.add(e.to);
			if (e.to === focus) keep.add(e.from);
		}
	}
	return keep;
};
