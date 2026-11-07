import React, { useDeferredValue, useMemo, useState } from "react";
import styled from "styled-components";
import { Panel, Subtle } from "../components/ui";
import { kindColors } from "../theme";
import { FindingDetail } from "../components/findings/FindingDetail";
import { FindingList } from "../components/findings/FindingList";
import { navigate } from "../utils/router";

// Two columns: the list (navigation) and the selected finding (its message, its
// rule, its repairs, and the picture of the place). This screen only decides
// WHICH finding is on screen: the wording comes from `report/errorTypes/` and
// the picture from `graph/decision.js`.
const Layout = styled.div`
	display: grid;
	grid-template-columns: minmax(300px, 0.85fr) minmax(0, 1.4fr);
	gap: 16px;
	align-items: start;
	@media (max-width: 1050px) { grid-template-columns: 1fr; }
`;

export const FindingsScreen = ({ data, params }) => {
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState("all");

	const invariantFilter = params.invariant ?? null;

	// The search reads EVERYTHING the report knows about a finding — message, fix,
	// plan, roles, rule conditions — not a hand-picked subset. Picking the fields
	// meant a symbol could be searched for and "not found" while the finding about
	// it was on screen: the reader could not tell "the rule sees nothing here" from
	// "the search does not look there".
	const haystacks = useMemo(() => data.findings.map((f) => JSON.stringify(f).toLowerCase()), [data.findings]);
	// Typing must not wait for 350 rows to re-render: the input keeps its own state
	// and React decides when the filtered list catches up. Without this every
	// keystroke paid for the whole list (seconds on this repo).
	const deferredQuery = useDeferredValue(query);
	const filtered = useMemo(() => {
		const needle = deferredQuery.trim().toLowerCase();
		if (!needle) {
			return data.findings.filter((f) => (invariantFilter ? f.invariant === invariantFilter : true) && (category === "all" || f.category === category));
		}
		const out = [];
		for (let i = 0; i < data.findings.length; i += 1) {
			const f = data.findings[i];
			if (invariantFilter && f.invariant !== invariantFilter) continue;
			if (category !== "all" && f.category !== category) continue;
			if (haystacks[i].includes(needle)) out.push(f);
		}
		return out;
	}, [data.findings, haystacks, invariantFilter, category, deferredQuery]);

	// Selection lives in the URL, so a finding is linkable and the back button works.
	// `file`+`line` is NOT an identity: two findings on one line of one file are the
	// normal case (structure and relation both complain about the same place), and
	// the second one was unreachable — its link resolved to the first match. `n`
	// says WHICH finding at that place, so each row opens itself.
	// One pass over the filtered list gives BOTH the selection and the `n` of every
	// row (`n` = which finding at this file:line, counting from 0).
	const { rows, selectedIndex } = useMemo(() => {
		const seen = new Map();
		const out = [];
		let selected = 0;
		for (let i = 0; i < filtered.length; i += 1) {
			const f = filtered[i];
			const place = `${f.file}:${f.line}`;
			const at = seen.get(place) ?? 0;
			seen.set(place, at + 1);
			out.push({ f, i, at });
			if (params.file && f.file === params.file && String(f.line) === String(params.line)) {
				const nth = Number(params.n ?? 0);
				const wanted = Number.isFinite(nth) ? Math.max(nth, 0) : 0;
				if (at === wanted) selected = i;
			}
		}
		return { rows: out, selectedIndex: selected };
	}, [filtered, params.file, params.line, params.n]);
	// Which slice of the list is on screen. `scrollTop` is the container's own
	// position; it resets whenever the filtered list changes, so the reader never
	// lands in the middle of a new result.
	// The picture is the fastest way to SEE what broke, so it is drawn by default.
	const [showGraph, setShowGraph] = useState(true);

	const current = filtered[selectedIndex] ?? null;
	const rule = current?.invariant ? data.invariants.find((i) => i.id === current.invariant) ?? null : null;
	const graphKinds = useMemo(() => kindColors(data.access.kinds), [data.access.kinds]);

	const openFinding = React.useCallback(
		(f, at) => navigate("findings", { ...(invariantFilter ? { invariant: invariantFilter } : {}), file: f.file, line: f.line, n: String(at) }),
		[invariantFilter],
	);
	const clearInvariant = () => navigate("findings", {});

	return (
		<Layout>
			<FindingList
				data={data}
				rows={rows}
				selectedIndex={selectedIndex}
				openFinding={openFinding}
				query={query}
				onQuery={setQuery}
				category={category}
				onCategory={setCategory}
				invariantFilter={invariantFilter}
				onClearInvariant={clearInvariant}
			/>
			{current ? (
				<FindingDetail
					current={current}
					rule={rule}
					nodes={data.nodes}
					graphKinds={graphKinds}
					showGraph={showGraph}
					onToggleGraph={() => setShowGraph((v) => !v)}
				/>
			) : (
				<Panel>
					<Subtle>Select a finding on the left.</Subtle>
				</Panel>
			)}
		</Layout>
	);
};
