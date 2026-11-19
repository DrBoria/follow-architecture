"use strict";

// `a` / `an` for a word — the ONE place English grammar about the indefinite
// article lives, so no message has to repeat the rule.
const article = (word: string, capital = false): string => {
	const an = /^[aeiou]/i.test(String(word));
	if (!capital) return an ? "an" : "a";

	return an ? "An" : "A";
};

export { article };
