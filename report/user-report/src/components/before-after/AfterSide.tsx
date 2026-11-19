"use strict";

// The three "after" cards a plan may show: a destination, a deletion, or no
// place named. Each is one named card so the row reads as a choice, not a
// nested ternary.

import React from "react";
import { nodeLabel } from "../../utils/format";
import { Card, CardTitle, Node, Path } from "./styles";
import type { Plan } from "../../../../../entities/enriched-finding";

// The code belongs here: the destination's label and its first path.
const AfterCard = ({ after }: { after: NonNullable<Plan["after"]> }): React.JSX.Element => (
	<Card $color="#4ade80">
		<CardTitle>should live here</CardTitle>
		<Node $color="#8ce6a8">{nodeLabel({ paths: after.paths }, 2) || after.node}</Node>
		<Path>{after.paths?.[0] ?? after.node ?? "…"}</Path>
	</Card>
);

// The repair says "delete", so the card says "deleted" — never "no destination"
// next to a sentence that deletes the code.
const RemovedCard = ({ plan }: { plan: Plan }): React.JSX.Element => (
	<Card $color="#ff6b6b">
		<CardTitle>after the fix</CardTitle>
		<Node $color="#ff8f8f">✕ removed</Node>
		<Path>{plan.repair?.text ?? "this code goes away"}</Path>
	</Card>
);

// No destination and no deletion: the code itself has to change.
const NoPlaceCard = (): React.JSX.Element => (
	<Card $color="#6b7788">
		<CardTitle>destination</CardTitle>
		<Node $color="#95a1b3">none named</Node>
		<Path>the repair names no place — the code itself has to change</Path>
	</Card>
);

// The card the plan earns: a destination, a deletion, or no place.
const AfterSide = ({ plan }: { plan: Plan }): React.JSX.Element => {
	if (plan.after) return <AfterCard after={plan.after} />;
	if (plan.remove) return <RemovedCard plan={plan} />;
	return <NoPlaceCard />;
};

export { AfterSide };
