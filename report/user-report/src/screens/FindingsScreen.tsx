// Two columns: the list (navigation) and the selected finding (its message, its
// rule, its repairs, and the picture of the place). This screen only decides
// WHICH finding is on screen: the wording comes from `report/errorTypes/` and
// the picture from `graph/decision`. The reads live in `findings-reads`.

import React, { useDeferredValue, useMemo, useState } from "react";
import styled from "styled-components";
import { Panel, Subtle } from "../components/ui";
import { kindColors } from "../theme";
import { FindingDetail } from "../components/findings/FindingDetail";
import { FindingList } from "../components/findings/FindingList";
import { navigate } from "../utils/router";
import { haystacksOf, filteredOf, rowsOf } from "./findings-reads";
import type { ScreenProps } from "./contract";
import type { EnrichedFinding } from "../../../../entities/enriched-finding";

// Two columns: the list and the selected finding. One column on a narrow screen.
const Layout = styled.div`
	display: grid;
	grid-template-columns: minmax(300px, 0.85fr) minmax(0, 1.4fr);
	gap: 16px;
	align-items: start;
	@media (max-width: 1050px) { grid-template-columns: 1fr; }
`;

export const FindingsScreen = ({ data, params }: ScreenProps): React.JSX.Element => {
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState("all");
	// The picture is the fastest way to SEE what broke, so it is drawn by default.
	const [showGraph, setShowGraph] = useState(true);
	const invariantFilter = params.invariant ?? null;

	const haystacks = useMemo(() => haystacksOf(data.findings), [data.findings]);
	// Typing must not wait for 350 rows to re-render: the input keeps its own
	// state and React decides when the filtered list catches up.
	const deferredQuery = useDeferredValue(query);
	const filtered = useMemo(
		() => filteredOf({ findings: data.findings, haystacks, needle: deferredQuery.trim().toLowerCase(), invariantFilter, category }),
		[data.findings, haystacks, invariantFilter, category, deferredQuery],
	);

	// Selection lives in the URL, so a finding is linkable and the back button works.
	const { rows, selectedIndex } = useMemo(() => rowsOf(filtered, params), [filtered, params]);
	const current = filtered[selectedIndex] ?? null;
	const rule = current?.invariant ? data.invariants.find((i) => i.id === current.invariant) ?? null : null;
	const graphKinds = useMemo(() => kindColors(data.access.kinds), [data.access.kinds]);

	const openFinding = React.useCallback(
		(f: EnrichedFinding, at: number) => navigate("findings", { ...(invariantFilter ? { invariant: invariantFilter } : {}), file: f.file, line: f.line, n: String(at) }),
		[invariantFilter],
	);
	const clearInvariant = (): void => navigate("findings", {});

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
