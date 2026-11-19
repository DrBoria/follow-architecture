"use strict";

// A VERDICT LIST is one mechanism: entries are judged, the refusals are ranked
// by how well they EXPLAIN the rule, and the best explanation is the one the
// reader gets. The relation check ranks the target roles an edge could be
// judged by (`nodes/finally/relations`); any consumer that must pick the most
// informative refusal asks the same question. The ranking is the caller's own
// policy; the walk — rank, then take the head only when EVERY entry refuses —
// lives here once.

// Rank refusals best-explanation-first and return the head, but only when the
// list is non-empty and every entry is a refusal. One dissenting entry means
// the subject is allowed somewhere, and there is nothing to report.
const worstWhenAllRefuse = <T extends { violation: boolean }>(entries: T[], rank: (a: T, b: T) => number): T | null => {
	if (!entries.length || !entries.every((e) => e.violation)) return null;
	const sorted = [...entries].sort(rank);

	return sorted[0];
};

export { worstWhenAllRefuse };