"use strict";

// A finding's TITLE: the engine's own first sentence when it sent one, else a
// humanized id (the invariant, the role, the node). The report invents no
// vocabulary of its own — a relation finding is titled by the engine's sentence.

// `some-custom-rule` / `someRole` → `Some custom rule` / `Some Role`.
const humanize = (id: string | null | undefined): string =>
	String(id ?? "")
		.replace(/[-_]+/g, " ")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/^./, (c) => c.toUpperCase());

// The first sentence of a message, capped so a card title stays one line.
const firstSentence = (text: string | null | undefined, max = 72): string => {
	const s = String(text ?? "").trim();
	if (!s) return "";
	const cut = /^(.+?[.!?])(\s|$)/.exec(s)?.[1] ?? s;
	return cut.length > max ? `${cut.slice(0, max - 1).trim()}…` : cut;
};

type TitleArgs = { invariant: string | null; role: string | null; node: string | null | undefined; rule: string; message: string };

// The id-based title when the engine sent no sentence: the invariant, the role,
// the node — whichever the finding names first.
const titleFallback = (args: TitleArgs): string => humanize(args.invariant ?? args.role ?? args.node ?? args.rule);

const titleFor = (args: TitleArgs): string => {
	const sentence = firstSentence(args.message);
	return sentence || titleFallback(args);
};

// The category a rule belongs to: invariant, codeRole, or structure.
const categoryOf = (rule: string): string => {
	if (rule === "invariant") return "invariant";
	return rule === "codeRoles" ? "codeRole" : "structure";
};

export { humanize, firstSentence, titleFor, categoryOf };
