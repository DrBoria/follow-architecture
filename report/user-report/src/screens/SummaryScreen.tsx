// The overview's first screen: what the report is, the findings by category,
// the orphans, how to read it, and the most important findings. The panels live
// in `summary-panels`; this screen is the two-column layout and the top pick.

import React from "react";
import styled from "styled-components";
import { AboutPanel, CategoryPanel, OrphanPanel, HelpPanel, TopPanel } from "./summary-panels";
import type { ScreenProps } from "./contract";
import type { EnrichedFinding } from "../../../../entities/enriched-finding";

const Grid = styled.div`
	display: grid;
	grid-template-columns: 1.15fr 0.85fr;
	gap: 16px;
	@media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const Column = styled.div`
	display: grid;
	gap: 16px;
	align-content: start;
`;

// Structure findings first (the placement problems), then the rest; ties keep
// their order.
const byCategory = (a: EnrichedFinding, b: EnrichedFinding): number => {
	if (a.category === b.category) return 0;
	return a.category === "structure" ? -1 : 1;
};

export const SummaryScreen = ({ data }: ScreenProps): React.JSX.Element => {
	const { stats, findings, meta } = data;
	const top = [...findings].sort(byCategory).slice(0, 4);

	return (
		<Grid>
			<Column>
				<AboutPanel data={data} />
				<CategoryPanel data={data} />
				{meta.orphans.length ? <OrphanPanel orphans={meta.orphans} /> : null}
			</Column>
			<Column>
				<HelpPanel />
				{top.length ? <TopPanel top={top} total={stats.findings} /> : null}
			</Column>
		</Grid>
	);
};
