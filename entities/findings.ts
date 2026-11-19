"use strict";

// THE finding contract — the ONE description of what a check produces and what
// the producer callback looks like. Every checker (`nodes`, `invariants`, the
// pipeline) appends to the same list through the same callback; the report
// reads the bags. A finding is an opaque bag of plain data — this module only
// names its shape, never its wording.

import type { FieldValue } from "../utils/field";
import type { ReportObject } from "./architecture";

// A finding is an opaque bag the report reads — a checker only builds it.
type Finding = Record<string, FieldValue>;

// What a checker states about one finding: its report (a sentence or a spec),
// the line it sits on, optional evidence, and an optional dedupe key. The legacy
// flat spelling (`message`/`fix`/`role` directly on the item) still reads, so a
// producer that has not migrated to `report` keeps working.
type FindingItem = {
	key?: string | null;
	report?: string | ReportObject | null;
	line?: number;
	data?: FieldValue;
	message?: string | null;
	fix?: string | null;
	role?: string | null;
};

// The 5-position producer, declared as a tuple-rest so the arity is preserved
// while the parameter-count rule governs ONE parameter.
type FindingFrom = (...args: [item: FindingItem, rule: string, node: string, key: string, vars: Record<string, FieldValue>]) => Finding;

export type { Finding, FindingItem, FindingFrom };