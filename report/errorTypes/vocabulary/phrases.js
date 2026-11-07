"use strict";

// Facts → words: a relation fact becomes a phrase, a subject and a reason.
"use strict";

// Facts → words. A relation fact (`{ kind, form, … }`) becomes a phrase.

const q = (s) => (s == null ? "—" : `\`${s}\``);
const list = (xs) => xs.map(q).join(", ");

const article = (word) => (/^[aeiou]/i.test(String(word ?? "")) ? "an" : "a");

// A sentence about SEVERAL pieces takes the plural: "`a`, `b` change …".
const PLURALS = {
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

const pluralize = (text) => {
	for (const [one, many] of Object.entries(PLURALS)) {
		if (text.startsWith(one)) return many + text.slice(one.length);
	}
	return text;
};

const factText = (fact) => {
	if (!fact) return "does something the architecture does not describe";
	switch (fact.kind) {
		case "import":
			return fact.form === "statement" ? `imports ${q(fact.resolved)}` : `requires ${q(fact.source)}`;
		case "typeImport":
			return `names a type of ${q(fact.resolved)}`;
		case "export": {
			const names = fact.names ?? [];
			if (fact.form === "namespace") return `re-exports ${q(fact.source)} as ${q(names[0] ?? fact.name)}`;
			if (fact.form === "star") return `re-exports ${q(fact.source)}`;
			if (fact.form === "default") return "is exported as its default";
			if (fact.form === "equals") return "is exported with `export =`";
			if (fact.form === "declared") return "is exported";
			if (fact.reExport) {
				const from = fact.resolved ?? fact.source;
				const what = names.length ? `re-exports ${list(names)}` : "re-exports its whole module";
				return from ? `${what} from ${q(from)}` : what;
			}
			if (names.length) return `exports ${list(names)}`;
			if (fact.name) return `exports ${q(fact.name)} through CommonJS`;
			return "is exported through CommonJS";
		}
		case "declare":
			return fact.renames ? `re-declares ${q(fact.renames.action)} of ${q(fact.renames.module)}` : "is declared here";
	case "call": {
		// WHAT it was given: the value that made the call illegal. A built `.d.ts`
		// names a shape, not a value with an owner, so it is left out.
		const given = (fact.with ?? []).filter((w) => w.type && !w.type.endsWith(".d.ts")).map((w) => `${q(w.text)} of ${q(w.type)}`);

		return `calls ${q(fact.action)} of ${q(fact.module)}${given.length ? ` with ${given.join(", ")}` : ""}`;
	}
		case "mutate":
			if (fact.onThis) return `changes ${q(fact.target)} of its own file`;
			if (fact.ownerRole) return `changes ${q(fact.target)} of the ${q(fact.ownerRole)} (${q(fact.module)})`;
			return `changes ${q(fact.target)} of ${q(fact.module)}`;
		case "assign":
			return `writes into ${q(fact.target)}${fact.method ? ` through ${q(`${fact.method}()`)}` : ""}`;
		case "read":
		return `reads ${q(fact.what)}${fact.module ? ` of ${q(fact.module)}` : ""}`;
	default:
			return `does a \`${fact.kind}\` the architecture does not describe`;
	}
};

const subjectText = (subject, file) => {
	const roles = (subject?.roles ?? []).filter(Boolean).map(q);
	const rolesPart = roles.length ? (roles.length === 1 ? ` (${roles[0]})` : ` (${roles.join(" / ")})`) : "";
	if (!subject || subject.scope) {
		return `the module scope of ${q(file)}${rolesPart}`;
	}
	const pieces = (subject.pieces ?? []).filter(Boolean).map(q);
	if (!pieces.length) return `the module scope of ${q(file)}${rolesPart}`;
	const who = subject.roles?.length === 1 ? ` (${article(subject.roles[0])} ${q(subject.roles[0])})` : rolesPart;
	return `${pieces.join(", ")}${who || " (which no role describes)"}`;
};

// WHY it is refused — a code from the engine, not a sentence.
const whyText = (why) => {
	if (!why) return "it is not allowed";
	if (why.code === "silent") return "nothing in the architecture allows it";
	const same = new Set(why.sameRoles ?? []);
	// A role the rule limits to the SAME feature instance says so: without the
	// limit the sentence reads as "this role may not do it at all", which is the
	// opposite of what the architecture declares.
	const roles = (why.roles ?? []).filter(Boolean).map((r) => (same.has(r) ? `${q(r)} in the same feature` : q(r)));
	// The role DOES allow the call — what it refuses is the value handed over.
	if (why.outward) return "that value may not be handed to it";
	if (!roles.length) return why.code === "nobody" ? "no code may do it" : "it is not allowed";
	if (why.self) return `only ${roles.join(", ")} may do it`;
	return `only ${roles.join(", ")} may do it with ${q(why.targetNode)} code`;
};

// The one sentence a refused relation gets.
const relationMessage = (token, { file } = {}) => {
	const what = factText(token?.fact);
	return `${subjectText(token?.subject, file)} ${token?.subject?.plural ? pluralize(what) : what}, but ${whyText(token?.why)}`;
};

module.exports = { factText, subjectText, whyText, relationMessage, pluralize, article };
