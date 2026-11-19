"use strict";

// A PERMISSION is one mechanism: an action's `where` says who may do it, and
// its `except` says when that allowance stops. The relation check asks it of
// one edge (`nodes/finally/relations-edge`); any consumer that judges an act
// against a declared allowance asks the same two questions. The walk — allow
// when some `where` entry admits, then refuse when some `except` entry admits —
// lives here once. What the entries MEAN is the shared `where` grammar's own.

import { checkWhere } from "../entities/location";
import type { Arch, ActionDef } from "../entities/architecture";
import type { FileFacts } from "../entities/facts";
import type { Caps } from "../entities/location/where";

// The verdict one action gives one subject: allowed, and whether an `except`
// still refuses the value handed over.
type Permission = { allowed: boolean; denied: boolean };

// What one permission question is asked of: the place, the tree, the subject's
// facts, and the target's captures.
type PermissionAsk = { rel: string; arch: Arch; scope: FileFacts | null | undefined; caps: Caps | null };

const permissionOf = (action: ActionDef, ask: PermissionAsk): Permission => {
	const allowed = !checkWhere(action.where, ask.rel, ask.arch, ask.scope, ask.caps);
	const denied = (action.except ?? []).length ? !checkWhere(action.except, ask.rel, ask.arch, ask.scope, ask.caps) : false;

	return { allowed, denied };
};

export { permissionOf };
export type { Permission };