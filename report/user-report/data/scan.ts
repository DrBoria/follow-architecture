"use strict";

// Filesystem helpers for the overview report: cached file reads, code
// snippets around a declaration, and small path utilities. The overview
// re-reads sources (separately from the lint pass) so a single file is read
// once no matter how many roles/examples point at it.

import * as fs from "node:fs";
import { readOrFallback } from "../../../utils/try-read";
import type { Snippet } from "../../../entities/overview-summaries";

const textCache = new Map<string, string>();

const cacheRead = (abs: string): string => {
	const text = fs.readFileSync(abs, "utf8");
	textCache.set(abs, text);
	return text;
};

const readText = (abs: string): string => {
	const cached = textCache.get(abs);
	return cached !== undefined ? cached : cacheRead(abs);
};

// A code window starting at `line` (1-based). `max` caps the height so a huge
// function does not blow up the payload; `before` adds leading context.
const snippet = (abs: string, line: number | null | undefined, opts: { before?: number; max?: number } = {}): Snippet | null => {
	const { before = 0, max = 14 } = opts;
	return readOrFallback(
		abs,
		(file) => {
			const lines = readText(file).split("\n");
			const start = Math.max(0, (line ?? 1) - 1 - before);
			const body = lines.slice(start, start + max).map((l) => l.replace(/\t/g, "  "));
			while (body.length && body[body.length - 1].trim() === "") body.pop();
			return { startLine: start + 1, lines: body, truncated: lines.length > start + max };
		},
		null,
	);
};

const lineCount = (abs: string): number => readOrFallback(abs, (file) => readText(file).split("\n").length, 0);

export { readText, snippet, lineCount };
