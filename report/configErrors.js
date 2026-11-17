"use strict";

// Everything the tool says about a CONFIG it cannot read. One place, because a
// message about `architecture.yaml` is shown to a person who has to fix that
// file: it must name the key, the allowed keys and why — never a stack trace
// with the reason buried in it.
//
// Each builder returns an `Error`: the caller decides whether that is fatal
// (a config is loaded once, at the start) but never what it SAYS.

// A config failure is a sentence for the reader, not a crash: it says what the
// file claims and what it may claim instead. `main` prints it and stops; anything
// else that throws is a bug in the engine and keeps its stack.
const fail = (message) => Object.assign(new Error(message), { isConfigError: true });

const list = (xs) => [...xs].map((x) => `\`${x}\``).join(", ");
const fenced = (xs) => [...xs].join(" | ");

// ── the architecture file itself ──────────────────────────────────────────
// The file itself: a path that does not open, or text that is not YAML/JSON. Both
// are the reader's to fix, so both are sentences with the reason attached.
// The path is added ONCE, by whoever loaded the file — so these two name the
// problem, not the location.
const unreadable = ({ code }) => fail(`architecture: cannot read the file${code ? ` (${code})` : ""}`);
const unparseable = ({ reason }) => fail(`architecture: not YAML or JSON — ${reason}`);

const notAnObject = () => fail("architecture: expected an object — the file must be a map of `aliases`, `codeRoles`, `nodes`, `invariants`");
const withoutNodes = () => fail("architecture.nodes: must be a non-empty array or object — a tree with no nodes describes no place");
const duplicateInvariantIds = (ids) => fail(`architecture.invariants: ids must be unique — repeated: ${list([...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))])}`);
const nodeRoleUnknown = (role) => fail(`nodes: \`role: ${role}\` names no codeRole — the node gives a home to code the config never describes`);

// ── codeRoles ─────────────────────────────────────────────────────────────
const roleNotAnObject = () => fail("codeRoles: each entry must be an object with a `slug`");
const roleWithoutSlug = () => fail("codeRoles: each entry needs a `slug`");
const roleInfersUnknown = ({ role, entry }) => fail(`codeRoles: \`${role}\` infers by unknown role \`${entry}\``);
const roleInfersItself = ({ role }) => fail(`codeRoles: \`${role}\` infers by itself`);
const unknownRoleKey = ({ role, key, allowed }) =>
	fail(`codeRoles: \`${role}.${key}\` is not a role key — a role is ${list(allowed)}; actions belong under \`actions\``);
const roleWhereNotAllowed = ({ role }) =>
	fail(
		`codeRoles: \`${role}.where\` — a role says WHAT code is, a node says WHERE it lives: move it to a child of the node that holds it — \`- { name: <file>, role: ${role} }\` for one file, \`- { name: <folder>, role: ${role} }\` for a whole folder`,
	);

const actionNotAnObject = ({ role, action }) => fail(`codeRoles: \`${role}.actions.${action}\` must be an object with \`where\``);
const actionWithoutWhere = ({ role, action }) => fail(`codeRoles: \`${role}.actions.${action}\` has no \`where\` — a permission that names nobody allows nobody`);
// `name` is the path the reader must open: `<role>.actions.<action>`.
const unknownActionKey = ({ name, key, allowed }) =>
	fail(`codeRoles: \`${name}.${key}\` is not an action key — use ${list(allowed)}`);
const unknownActionFact = ({ value, known }) =>
	fail(`codeRoles: action says \`of: ${value}\` — the fact layer produces ${fenced(known)}`);
const scopeNotOneOf = ({ got, allowed }) => fail(`codeRoles: scopeAccess \`scope\` must be one of ${fenced(allowed)}, got ${JSON.stringify(got)}`);
const emptyAccessorSegments = ({ scope }) => fail(`codeRoles: scopeAccess entry for scope \`${scope}\` needs a non-empty \`segments\` list`);

// ── nodes ─────────────────────────────────────────────────────────────────
const unknownNodeKey = ({ node, key, allowed }) =>
	fail(`nodes: \`${node}.${key}\` is not a node key — a node is structure only (${list(allowed)}); roles, actions and \`where\` belong to the codeRole`);
const unknownNodeParent = ({ node, parent }) => fail(`nodes: \`${node}\` names unknown parent \`${parent}\``);
const unknownNodeChild = ({ node, child }) => fail(`nodes: \`${node}\` names unknown child \`${child}\``);

// ── invariants ────────────────────────────────────────────────────────────
const invariantNotAnObject = () => fail("invariants: each entry must be an object with an `id`");
const invariantWithoutId = () => fail("invariants: each entry needs an `id`");
const unknownInvariantKey = ({ id, key, allowed }) =>
	fail(`invariants: \`${id}.${key}\` is not a key — an invariant is ${list(allowed)}`);
const dedupeByNotAPlace = ({ value }) => fail(`invariants: \`dedupeBy: ${value}\` is not a place — use a \`where\` entry (\`{ node: <slug> }\`, a glob, or a filter)`);

// ── the engine's own tables (a broken build, not a user mistake) ───────────
const relationWithoutProducer = ({ relation }) => fail(`kinds: relation \`${relation}\` is declared but has no producer`);
const undeclaredRelation = ({ relation }) => fail(`kinds: \`${relation}\` has a producer but is not declared`);
const syntaxProviderIncomplete = () => fail("css/syntax: a provider needs an `id` and `facts(text)`");
const unknownOperator = ({ op }) => fail(`queries: unknown operator \`${op}\``);
const unknownListOperator = ({ op }) => fail(`queries: unknown list operator \`${op}\``);
const atWithoutIndex = () => fail("queries: `at` needs a numeric `index`");
const invalidPattern = ({ where, pattern, reason }) => fail(`${where}: invalid pattern \`${pattern}\` — ${reason}`);

module.exports = {
	unreadable,
	unparseable,
	notAnObject,
	withoutNodes,
	duplicateInvariantIds,
	nodeRoleUnknown,
	roleNotAnObject,
	roleWithoutSlug,
	roleInfersUnknown,
	roleInfersItself,
	unknownRoleKey,
	roleWhereNotAllowed,
	actionNotAnObject,
	actionWithoutWhere,
	unknownActionKey,
	unknownActionFact,
	scopeNotOneOf,
	emptyAccessorSegments,
	unknownNodeKey,
	unknownNodeParent,
	unknownNodeChild,
	invariantNotAnObject,
	invariantWithoutId,
	unknownInvariantKey,
	dedupeByNotAPlace,
	relationWithoutProducer,
	undeclaredRelation,
	syntaxProviderIncomplete,
	unknownOperator,
	unknownListOperator,
	atWithoutIndex,
	invalidPattern,
};
