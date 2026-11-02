"use strict";

// Filesystem helpers for the overview report: cached file reads, code
// snippets around a declaration, and small path utilities. The overview
// re-reads sources (separately from the lint pass) so a single file is read
// once no matter how many roles/examples point at it.

const fs = require("node:fs");

const textCache = new Map();

const readText = (abs) => {
	if (!textCache.has(abs)) textCache.set(abs, fs.readFileSync(abs, "utf8"));
	return textCache.get(abs);
};

// A code window starting at `line` (1-based). `max` caps the height so a huge
// function does not blow up the payload; `before` adds leading context.
const snippet = (abs, line, { before = 0, max = 14 } = {}) => {
	let text;
	try {
		text = readText(abs);
	} catch {
		return null;
	}
	const lines = text.split("\n");
	const start = Math.max(0, (line ?? 1) - 1 - before);
	const body = lines.slice(start, start + max).map((l) => l.replace(/\t/g, "  "));
	while (body.length && body[body.length - 1].trim() === "") body.pop();
	return { startLine: start + 1, lines: body, truncated: lines.length > start + max };
};

const lineCount = (abs) => {
	try {
		return readText(abs).split("\n").length;
	} catch {
		return 0;
	}
};



// Trim a message for compact table cells without cutting a word in half.
const ellipsis = (text, max = 160) => {
	const s = String(text ?? "")
		.replace(/\s+/g, " ")
		.trim();
	if (s.length <= max) return s;
	const cut = s.slice(0, max);
	const space = cut.lastIndexOf(" ");
	return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trim()}…`;
};

module.exports = {readText, snippet, lineCount};
