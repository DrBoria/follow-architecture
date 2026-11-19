"use strict";

// A NOTICE is NOT a finding. No rule was broken: the tool could not READ
// something — a facet threw on a file, a stylesheet parser rejected a value, a
// config file did not load. It still belongs to the report, because a reader has
// to be told that an answer is PARTIAL, and a bare `console.warn` only ever
// reached a terminal nobody looks at twice.
//
// One sentence, one place: whoever notices the problem states the subject (what
// was being read) and the reason. Nothing here decides wording per caller.

const lines: string[] = [];
const seen = new Set<string>();

const notice = (subject: string, reason: string): string => {
	const line = `${subject}: ${reason}`;
	if (seen.has(line)) return line;
	seen.add(line);
	lines.push(line);
	return line;
};

// The run hands its notices to the report and starts clean: a second run in the
// same process starts with an empty list.
const takeNotices = (): string[] => lines.splice(0, lines.length);

const resetNotices = (): void => {
	lines.length = 0;
	seen.clear();
};

export { notice, takeNotices, resetNotices };
