"use strict";

// Facts → words: a relation fact becomes a phrase, a subject and a reason.
// The fact is the engine's own (`entities/kinds` producers); the words here are
// the ONE spelling the text and the picture read. Every field is read through
// the shared field readers — a fact is plain data, never an `any`.

import { RELATION } from "../../../entities/kinds";
import { fieldOf, isObj, type FieldValue } from "../../../utils/field";
import { stringField, stringListField, recordField, recordListField, booleanField } from "../../../utils/read-field";
import { article } from "../../../utils/article";

const q = (s: FieldValue): string => (s == null ? "—" : `\`${s}\``);
const list = (xs: readonly FieldValue[]): string => xs.map(q).join(", ");

// A sentence about SEVERAL pieces takes the plural: "`a`, `b` change …".
const PLURALS: Record<string, string> = {
	"changes ": "change ",
	"writes into ": "write into ",
	"calls ": "call ",
	"imports ": "import ",
	"exports ": "export ",
	"re-exports ": "re-export ",
	"re-declares ": "re-declare ",
	"names a type of ": "name a type of ",
	"reads ": "read ",
	"is exported": "are exported",
	"is declared here": "are declared here",
};

const pluralize = (text: string): string => {
	for (const [one, many] of Object.entries(PLURALS)) {
		if (text.startsWith(one)) return many + text.slice(one.length);
	}
	return text;
};

// The export forms that read as a re-export of a whole module / a default.
const exportFormText = (fact: FieldValue): string | null => {
	const form = stringField(fact, "form");
	if (form === "namespace") return `re-exports ${q(fieldOf(fact, "source"))} as ${q(stringListField(fact, "names")[0] ?? fieldOf(fact, "name"))}`;
	if (form === "star") return `re-exports ${q(fieldOf(fact, "source"))}`;
	if (form === "default") return "is exported as its default";
	if (form === "equals") return "is exported with `export =`";
	if (form === "declared") return "is exported";
	return null;
};

const exportText = (fact: FieldValue): string => {
	const form = exportFormText(fact);
	if (form) return form;
	const names = stringListField(fact, "names");
	if (booleanField(fact, "reExport")) {
		const from = fieldOf(fact, "resolved") ?? fieldOf(fact, "source");
		const what = names.length ? `re-exports ${list(names)}` : "re-exports its whole module";
		return from ? `${what} from ${q(from)}` : what;
	}
	if (names.length) return `exports ${list(names)}`;
	const name = fieldOf(fact, "name");
	if (name) return `exports ${q(name)} through CommonJS`;
	return "is exported through CommonJS";
};

// WHAT a call was given: the values that made it illegal. A built `.d.ts` names
// a shape, not a value with an owner, so it is left out.
const callGiven = (fact: FieldValue): string => {
	const given = recordListField(fact, "with")
		.filter((w) => {
			const type = stringField(w, "type");
			return Boolean(type) && !type.endsWith(".d.ts");
		})
		.map((w) => `${q(fieldOf(w, "text"))} of ${q(fieldOf(w, "type"))}`);
	return given.length ? ` with ${given.join(", ")}` : "";
};

const callText = (fact: FieldValue): string =>
	`calls ${q(fieldOf(fact, "action"))} of ${q(fieldOf(fact, "module"))}${callGiven(fact)}`;

const mutateText = (fact: FieldValue): string => {
	if (booleanField(fact, "onThis")) return `changes ${q(fieldOf(fact, "target"))} of its own file`;
	const ownerRole = fieldOf(fact, "ownerRole");
	if (ownerRole) return `changes ${q(fieldOf(fact, "target"))} of the ${q(ownerRole)} (${q(fieldOf(fact, "module"))})`;
	return `changes ${q(fieldOf(fact, "target"))} of ${q(fieldOf(fact, "module"))}`;
};

const declareText = (fact: FieldValue): string => {
	const renames = recordField(fact, "renames");
	if (renames) return `re-declares ${q(fieldOf(renames, "action"))} of ${q(fieldOf(renames, "module"))}`;
	return "is declared here";
};

const importText = (fact: FieldValue): string =>
	stringField(fact, "form") === "statement" ? `imports ${q(fieldOf(fact, "resolved"))}` : `requires ${q(fieldOf(fact, "source"))}`;

const assignText = (fact: FieldValue): string => {
	const method = fieldOf(fact, "method");
	return `writes into ${q(fieldOf(fact, "target"))}${method ? ` through ${q(`${method}()`)}` : ""}`;
};

const readText = (fact: FieldValue): string => {
	const module = fieldOf(fact, "module");
	return `reads ${q(fieldOf(fact, "what"))}${module ? ` of ${q(module)}` : ""}`;
};

const factText = (fact: FieldValue): string => {
	if (!isObj(fact)) return "does something the architecture does not describe";
	const kind = stringField(fact, "kind");
	if (kind === RELATION.IMPORT) return importText(fact);
	if (kind === RELATION.TYPE_IMPORT) return `names a type of ${q(fieldOf(fact, "resolved"))}`;
	if (kind === RELATION.EXPORT) return exportText(fact);
	if (kind === RELATION.DECLARE) return declareText(fact);
	if (kind === RELATION.CALL) return callText(fact);
	if (kind === RELATION.MUTATE) return mutateText(fact);
	if (kind === RELATION.ASSIGN) return assignText(fact);
	if (kind === RELATION.READ) return readText(fact);
	return `does a \`${kind}\` the architecture does not describe`;
};

const rolesSuffix = (roles: string[]): string => {
	if (!roles.length) return "";
	return roles.length === 1 ? ` (${roles[0]})` : ` (${roles.join(" / ")})`;
};

const subjectText = (subject: FieldValue, file: string): string => {
	const roleNames = stringListField(subject, "roles").filter(Boolean);
	const roles = roleNames.map(q);
	const rolesPart = rolesSuffix(roles);
	if (!isObj(subject) || booleanField(subject, "scope")) {
		return `the module scope of ${q(file)}${rolesPart}`;
	}
	const pieces = stringListField(subject, "pieces").filter(Boolean).map(q);
	if (!pieces.length) return `the module scope of ${q(file)}${rolesPart}`;
	const who = roleNames.length === 1 ? ` (${article(roleNames[0])} ${q(roleNames[0])})` : rolesPart;
	return `${pieces.join(", ")}${who || " (which no role describes)"}`;
};

// WHY it is refused — a code from the engine, not a sentence.
const whyText = (why: FieldValue): string => {
	if (!isObj(why)) return "it is not allowed";
	if (stringField(why, "code") === "silent") return "nothing in the architecture allows it";
	const same = new Set(stringListField(why, "sameRoles"));
	// A role the rule limits to the SAME feature instance says so: without the
	// limit the sentence reads as "this role may not do it at all", which is the
	// opposite of what the architecture declares.
	const roles = stringListField(why, "roles").filter(Boolean).map((r) => (same.has(r) ? `${q(r)} in the same feature` : q(r)));
	// The role DOES allow the call — what it refuses is the value handed over.
	if (booleanField(why, "outward")) return "that value may not be handed to it";
	if (!roles.length) return stringField(why, "code") === "nobody" ? "no code may do it" : "it is not allowed";
	if (booleanField(why, "self")) return `only ${roles.join(", ")} may do it`;
	return `only ${roles.join(", ")} may do it with ${q(fieldOf(why, "targetNode"))} code`;
};

// The one sentence a refused relation gets.
const relationMessage = (token: FieldValue, ctx: { file?: string } = {}): string => {
	const subject = fieldOf(token, "subject");
	const what = factText(fieldOf(token, "fact"));
	const plural = isObj(subject) && booleanField(subject, "plural");
	return `${subjectText(subject, ctx.file ?? "")} ${plural ? pluralize(what) : what}, but ${whyText(fieldOf(token, "why"))}`;
};

export { factText, subjectText, whyText, relationMessage, pluralize, article };
