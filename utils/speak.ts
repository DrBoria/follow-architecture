"use strict";

// A SPOKEN SET is one mechanism: a subject is named once — the first time it
// answers, it is remembered; every later answer of the same subject is silent.
// The invariant runtime speaks once per PIECE per rule (a `const` holding an
// arrow answers two entries, the reader needs one sentence); any consumer that
// names subjects without repeating itself asks the same question. The walk is
// the same — ask, remember, answer — so it lives here once. What a subject IS
// is the caller's own.

// True the FIRST time this subject is offered; false every time after.
const speakOnce = (spoken: Set<string>, subject: string): boolean => {
	if (spoken.has(subject)) return false;
	spoken.add(subject);

	return true;
};

export { speakOnce };