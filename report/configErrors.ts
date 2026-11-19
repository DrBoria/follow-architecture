"use strict";

// Everything the tool says about a CONFIG it cannot read. One place, because a
// message about `architecture.yaml` is shown to a person who has to fix that
// file: it must name the key, the allowed keys and why — never a stack trace
// with the reason buried in it.
//
// Each builder returns an `Error`: the caller decides whether that is fatal
// (a config is loaded once, at the start) but never what it SAYS.

import type { FieldValue } from "../utils/field";

// A config value as the reader may state it: a scalar, or a bag/list the
// normalizer rejected. The builders name it in the sentence via String/JSON.
type ConfigValue = FieldValue;

// A config failure is a sentence for the reader, not a crash. `main` prints it
// and stops; anything else that throws is a bug in the engine and keeps its stack.
type ConfigError = Error & { isConfigError: boolean };
const fail = (message: string): ConfigError => Object.assign(new Error(message), { isConfigError: true });

const list = (xs: Iterable<string>): string => [...xs].map((x) => `\`${x}\``).join(", ");
const fenced = (xs: Iterable<string>): string => [...xs].join(" | ");

// ── the architecture file itself ──────────────────────────────────────────
const unreadable = ({ code }: { code?: string }): ConfigError => fail(`architecture: cannot read the file${code ? ` (${code})` : ""}`);
const unparseable = ({ reason }: { reason: string }): ConfigError => fail(`architecture: not YAML or JSON — ${reason}`);

const notAnObject = (): ConfigError => fail("architecture: expected an object — the file must be a map of `aliases`, `codeRoles`, `nodes`, `invariants`");
const withoutNodes = (): ConfigError => fail("architecture.nodes: must be a non-empty array or object — a tree with no nodes describes no place");
const duplicateInvariantIds = (ids: readonly string[]): ConfigError => fail(`architecture.invariants: ids must be unique — repeated: ${list([...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))])}`);
const nodeRoleUnknown = (role: string): ConfigError => fail(`nodes: \`role: ${role}\` names no codeRole — the node gives a home to code the config never describes`);

// ── codeRoles ─────────────────────────────────────────────────────────────
const roleNotAnObject = (): ConfigError => fail("codeRoles: each entry must be an object with a `slug`");
const roleWithoutSlug = (): ConfigError => fail("codeRoles: each entry needs a `slug`");
const roleInfersUnknown = ({ role, entry }: { role: ConfigValue; entry: string }): ConfigError => fail(`codeRoles: \`${role}\` infers by unknown role \`${entry}\``);
const roleInfersItself = ({ role }: { role: ConfigValue }): ConfigError => fail(`codeRoles: \`${role}\` infers by itself`);
const unknownRoleKey = ({ role, key, allowed }: { role: ConfigValue; key: string; allowed: readonly string[] }): ConfigError =>
	fail(`codeRoles: \`${role}.${key}\` is not a role key — a role is ${list(allowed)}; actions belong under \`actions\``);
const roleWhereNotAllowed = ({ role }: { role: ConfigValue }): ConfigError =>
	fail(
		`codeRoles: \`${role}.where\` — a role says WHAT code is, a node says WHERE it lives: move it to a child of the node that holds it — \`- { name: <file>, role: ${role} }\` for one file, \`- { name: <folder>, role: ${role} }\` for a whole folder`,
	);

const actionNotAnObject = ({ role, action }: { role: ConfigValue; action: string }): ConfigError => fail(`codeRoles: \`${role}.actions.${action}\` must be an object with \`where\``);
const actionWithoutWhere = ({ role, action }: { role: ConfigValue; action: string }): ConfigError => fail(`codeRoles: \`${role}.actions.${action}\` has no \`where\` — a permission that names nobody allows nobody`);
const unknownActionKey = ({ name, key, allowed }: { name: string; key: string; allowed: readonly string[] }): ConfigError =>
	fail(`codeRoles: \`${name}.${key}\` is not an action key — use ${list(allowed)}`);
const unknownActionFact = ({ value, known }: { value: ConfigValue; known: readonly string[] }): ConfigError =>
	fail(`codeRoles: action says \`of: ${value}\` — the fact layer produces ${fenced(known)}`);
const scopeNotOneOf = ({ got, allowed }: { got: FieldValue; allowed: readonly string[] }): ConfigError =>
	fail(`codeRoles: scopeAccess \`scope\` must be one of ${fenced(allowed)}, got ${JSON.stringify(got)}`);
const emptyAccessorSegments = ({ scope }: { scope: string }): ConfigError => fail(`codeRoles: scopeAccess entry for scope \`${scope}\` needs a non-empty \`segments\` list`);

// ── nodes ─────────────────────────────────────────────────────────────────
const unknownNodeKey = ({ node, key, allowed }: { node: string; key: string; allowed: readonly string[] }): ConfigError =>
	fail(`nodes: \`${node}.${key}\` is not a node key — a node is structure only (${list(allowed)}); roles, actions and \`where\` belong to the codeRole`);
const unknownNodeParent = ({ node, parent }: { node: string; parent: string }): ConfigError => fail(`nodes: \`${node}\` names unknown parent \`${parent}\``);
const unknownNodeChild = ({ node, child }: { node: string; child: string }): ConfigError => fail(`nodes: \`${node}\` names unknown child \`${child}\``);

// ── invariants ────────────────────────────────────────────────────────────
const invariantNotAnObject = (): ConfigError => fail("invariants: each entry must be an object with an `id`");
const invariantWithoutId = (): ConfigError => fail("invariants: each entry needs an `id`");
const unknownInvariantKey = ({ id, key, allowed }: { id: ConfigValue; key: string; allowed: readonly string[] }): ConfigError =>
	fail(`invariants: \`${id}.${key}\` is not a key — an invariant is ${list(allowed)}`);
const dedupeByNotAPlace = ({ value }: { value: string }): ConfigError => fail(`invariants: \`dedupeBy: ${value}\` is not a place — use a \`where\` entry (\`{ node: <slug> }\`, a glob, or a filter)`);

// ── the engine's own tables (a broken build, not a user mistake) ───────────
const relationWithoutProducer = ({ relation }: { relation: string }): ConfigError => fail(`kinds: relation \`${relation}\` is declared but has no producer`);
const undeclaredRelation = ({ relation }: { relation: string }): ConfigError => fail(`kinds: \`${relation}\` has a producer but is not declared`);
const syntaxProviderIncomplete = (): ConfigError => fail("css/syntax: a provider needs an `id` and `facts(text)`");
const unknownOperator = ({ op }: { op: string }): ConfigError => fail(`queries: unknown operator \`${op}\``);
const unknownListOperator = ({ op }: { op: string }): ConfigError => fail(`queries: unknown list operator \`${op}\``);
const atWithoutIndex = (): ConfigError => fail("queries: `at` needs a numeric `index`");
const invalidPattern = ({ where, pattern, reason }: { where: string; pattern: string; reason: string }): ConfigError => fail(`${where}: invalid pattern \`${pattern}\` — ${reason}`);

export { unreadable, unparseable, notAnObject, withoutNodes, duplicateInvariantIds, nodeRoleUnknown, roleNotAnObject, roleWithoutSlug, roleInfersUnknown, roleInfersItself, unknownRoleKey, roleWhereNotAllowed, actionNotAnObject, actionWithoutWhere, unknownActionKey, unknownActionFact, scopeNotOneOf, emptyAccessorSegments, unknownNodeKey, unknownNodeParent, unknownNodeChild, invariantNotAnObject, invariantWithoutId, unknownInvariantKey, dedupeByNotAPlace, relationWithoutProducer, undeclaredRelation, syntaxProviderIncomplete, unknownOperator, unknownListOperator, atWithoutIndex, invalidPattern };
