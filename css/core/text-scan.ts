"use strict";

// Two scans over a value's text that both the variable reader and the `calc()`
// checker need: where a parenthesised group ends, and where its top-level comma
// is. A value may nest both, so neither is a regex.

// The index of the `)` that closes the `(` at `open`, or -1. Nested groups are
// counted, so `calc((a - b) / 2)` closes where it looks like it does.
const closingParen = (text: string, open: number): number => {
	let depth = 0;
	for (let index = open; index < text.length; index += 1) {
		if (text[index] === "(") depth += 1;
		else if (text[index] === ")") {
			depth -= 1;
			if (depth === 0) return index;
		}
	}

	return -1;
};

// The first comma not inside a nested group — the separator of `var(--x, 8px)`.
const topLevelComma = (text: string): number => {
	let depth = 0;
	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		if (char === "(") depth += 1;
		else if (char === ")") depth -= 1;
		else if (char === "," && depth === 0) return index;
	}

	return -1;
};

export { closingParen, topLevelComma };
