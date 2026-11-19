"use strict";

// THE SHAPE OF `architecture.yaml`, as data. Every validator reads its keys from
// here, so a key added to the format is added ONCE — three hand-written lists of
// key names is how a key ends up accepted by one validator and rejected by
// another.
//
// The wordings of the failures live in `report/configErrors.js`; this file only
// says what may appear.

const SCHEMA = Object.freeze({
	// The file itself.
	top: ["aliases", "codeRoles", "nodes", "invariants"],
	// One codeRole: WHAT the code is.
	role: ["slug", "name", "infer", "report", "actions"],
	// One action of a role: what may be done with that code, and by whom.
	action: ["where", "except", "of", "scopeAccess"],
	// One node: WHERE code lives.
	node: ["slug", "name", "parent", "children", "report", "role", "required"],
	// One invariant: a condition over facts.
	invariant: ["id", "where", "ignore", "when", "infer", "report", "dedupeBy", "children"],
});

export { SCHEMA };
