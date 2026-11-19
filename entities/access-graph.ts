"use strict";

// THE access-graph edge — one arrow the architecture allows between two
// places. DERIVED from the one producer (`buildAccessGraph`), so the Node
// builder and the browser canvas read the same shape. The payload is plain
// JSON: `byNode` is a record, never a Map.
//
// The folder graph and the role graph share the edge core; the role graph's
// boxes are roles (one per codeRole) rather than folders.

// One arrow. `kind` is the action name the config chose; `kinds` carries the
// merged actions when several share a folder pair. `scope` is how the same code
// may be reached WITHOUT an import. `broken` marks an arrow that IS a finding.
type AccessEdge = {
	kind: string;
	kinds: string[];
	scope: string[];
	from: string;
	to: string;
	fromPath: string;
	toPath: string;
	actor: string;
	actorPath?: string;
	actorRoles?: string[];
	actorRole: string | null;
	subject: string;
	subjectPath?: string;
	fromRoles?: string[];
	same: boolean;
	via: string;
	target: string;
	broken?: boolean;
	brokenCount?: number;
	option?: boolean;
};

// A rule that names no folder (a glob or a filter): the edge exists but cannot
// be drawn as a folder→folder arrow.
type Unplaceable = { kind: string; targetRole: string; who: string };

// A role named as an actor by a rule that cannot place it: the role's screen
// answers "who may do it" instead of being empty.
type Mention = { kind: string; targetRole: string; targetPaths: string[] };

// A finding that crossed a boundary, resolved to the two folders it touches.
type GraphViolation = {
	kind: string;
	from: string;
	to: string;
	role: string;
	file: string;
	line: number;
	title: string;
};

// One box of the role graph: a codeRole, with the places it may be met at.
type RoleNode = {
	slug: string;
	name: string;
	paths: string[];
	places: string[];
	note: string | null;
	fileCount: number;
};

// Per-folder adjacency, keyed by slug (plain JSON, never a Map).
type Adjacency = { in: AccessEdge[]; out: AccessEdge[] };

type AccessGraph = {
	kinds: string[];
	roles: string[];
	edges: AccessEdge[];
	violations: GraphViolation[];
	unplaceable: Unplaceable[];
	mentions: Record<string, Mention[]>;
	byNode: Record<string, Adjacency>;
	roleNodes: RoleNode[];
	roleEdges: AccessEdge[];
};

export type { AccessEdge, Unplaceable, Mention, GraphViolation, RoleNode, Adjacency, AccessGraph };
