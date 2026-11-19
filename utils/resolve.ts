"use strict";

// A REFERENCE is one mechanism: a name points at something declared elsewhere,
// and a reader follows it to an answer. An import follows a module specifier to
// a scanned file (`utils/imports`); a class attribute follows a binding name to
// the static string it was initialised with (`css/markup`). The walk is the
// same — the reference must exist, a target must be found for it, and the target
// is read only when it yields an answer — so it lives here once. What a target
// IS and how it is read are the caller's own; nothing here knows imports,
// candidates or CSS.

// Follow `reference` to an answer: find its target and read it. A missing
// reference, a missing target or an unreadable one is null — never a guess.
// The reader's own acceptance policy lives inside `read` (it returns null when
// the target does not qualify), so this walk stays the same for every consumer.
const resolveReference = <Reference, Target, Answer>(
	reference: Reference | null | undefined,
	find: (reference: Reference) => Target | null | undefined,
	read: (target: Target) => Answer | null,
): Answer | null => {
	if (reference == null) return null;
	const target = find(reference);
	if (target == null) return null;

	return read(target);
};

export { resolveReference };
