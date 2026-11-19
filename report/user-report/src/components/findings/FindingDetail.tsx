// The selected finding: what fired, the rule behind it, the repairs — and the
// picture of the place. NOTHING here decides what the picture means: the
// taxonomy (`report/errorTypes/`) decided the kind of problem and the wording,
// and `graph/decision` picked the representation for that kind. This file is
// the hook and the two panels only.

import React, { useMemo } from "react";
import { buildProblemView } from "../../graph";
import { StatementPanel, PicturePanel } from "./detail-panels";
import type { EnrichedFinding } from "../../../../../entities/enriched-finding";
import type { InvariantSummary, NodeSummary } from "../../../../../entities/overview-summaries";

type FindingDetailProps = {
	current: EnrichedFinding | null;
	rule: InvariantSummary | null;
	nodes: NodeSummary[];
	graphKinds: Record<string, string>;
	showGraph: boolean;
	onToggleGraph: () => void;
};

export const FindingDetail = ({ current, rule, nodes, graphKinds, showGraph, onToggleGraph }: FindingDetailProps): React.JSX.Element | null => {
	const view = useMemo(
		() => (current ? buildProblemView({ finding: current, story: current.story, nodes }) : null),
		[current, nodes],
	);
	if (!current || !view) return null;

	return (
		<div data-testid="finding-detail" style={{ display: "grid", gap: 16 }}>
			<StatementPanel current={current} rule={rule} />
			<PicturePanel view={view} current={current} graphKinds={graphKinds} showGraph={showGraph} onToggleGraph={onToggleGraph} />
		</div>
	);
};
