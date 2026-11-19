"use strict";

// A CLASSIFICATION is one mechanism: definitions are tried in DECLARED ORDER
// against a subject, and the FIRST whose `infer` filter matches names it. A
// code role classifies a piece of code (`code-roles/connector`), a file's own
// facts (`code-roles/classify`), and the roles a folder's files hold
// (`nodes/similar`) — all three ask the same question of the same filter
// engine, so the walk lives here once. What the definitions ARE and what a
// match MEANS is the caller's own; nothing here knows roles.

import { matches } from "../entities/queries";
import type { QueryFilter, QueryScope } from "../entities/architecture";
import type { FieldValue } from "../utils/field";

// One definition: a name plus the filter that recognises it.
type Definition = { name: string; infer: QueryFilter };

// The definitions a record of `{ infer }` specs declares, in the record's own
// (YAML) order. A spec without an infer filter can never match.
const definitionsOf = (defs: Record<string, { infer?: QueryFilter }> | null | undefined): Definition[] =>
	Object.entries(defs ?? {}).map(([name, def]) => ({ name, infer: def?.infer ?? null }));

// The first definition whose infer matches the subject, or null. A null/absent
// infer never matches — a definition that recognises nothing names nothing.
const firstMatch = (subject: FieldValue, defs: readonly Definition[], scope: QueryScope): string | null => {
	for (const def of defs) {
		if (def.infer != null && matches(subject, def.infer, scope)) return def.name;
	}

	return null;
};

export { definitionsOf, firstMatch };
export type { Definition };