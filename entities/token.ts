"use strict";

// THE relation token — the structured verdict the engine attaches to a refused
// relation, and the ONE shape the report's two representations read. The
// producer (`nodes/finally/relations-group`) builds it; the text
// (`errorTypes/vocabulary/phrases`) and the picture (`user-report/src/graph`)
// render it. It is plain data (a `FieldValue`), so it travels through the
// finding bag and the JSON payload unchanged.
//
// The fields are optional because a token may arrive partial (a linter message
// without a tree carries only `code` + `why`); every reader qualifies what it
// needs through the shared field readers, never by assuming a field is there.

import type { FieldValue } from "../utils/field";

// WHY a relation is refused: a code from the engine, the roles that may do it,
// the ones limited to the same instance, and the target it names.
type TokenWhy = {
	code?: string;
	roles?: string[];
	sameRoles?: string[];
	self?: boolean;
	outward?: boolean;
	targetNode?: string | null;
};

// WHO did it: the pieces, their roles, and whether the subject is plural.
type TokenSubject = {
	pieces?: string[];
	roles?: string[];
	plural?: boolean;
	scope?: boolean;
};

// The token: the fact that was refused, its subject, the route the architecture
// DOES allow, and the reason. `fact` is the engine's own fact record.
type RelationToken = {
	code?: string;
	fact?: FieldValue;
	subject?: TokenSubject;
	via?: string | null;
	why?: TokenWhy;
};

export type { RelationToken, TokenWhy, TokenSubject };
