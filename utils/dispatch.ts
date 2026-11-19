"use strict";

// A DISPATCH is one mechanism: a subject carries a discriminant, a table says
// which reader answers which case, and anything unclaimed falls to one default
// reading. A function-like node dispatches on the parser's kind to find its name
// (a named kind answers its own, anything else asks its parent —
// `entities/ast/functions`); a class attribute's initializer dispatches on the
// parser's kind to read its text (a literal, a `{expr}` — `css/markup`). The walk
// is the same — read the discriminant, ask the claiming reader, otherwise the
// default — so it lives here once. What the cases ARE and how each is read is the
// caller's own; nothing here knows functions or JSX.

// Answer `subject` by its discriminant: the claiming reader's answer when a
// reader claims the case, the default reading otherwise (including a missing
// subject or discriminant — an absent thing is nobody's case). The fallback is
// LAZY: a claiming reader's own answer (even null) is final and never overridden,
// and the default is computed only when no reader claims the case.
const dispatchOn = <Subject, Discriminant extends string | number, Answer>(
	subject: Subject | null | undefined,
	discriminantOf: (subject: Subject) => Discriminant | null | undefined,
	readers: ReadonlyMap<Discriminant, (subject: Subject) => Answer>,
	fallback: (subject: Subject | null | undefined) => Answer,
): Answer => {
	if (subject == null) return fallback(subject);
	const discriminant = discriminantOf(subject);
	const reader = discriminant == null ? undefined : readers.get(discriminant);
	if (!reader) return fallback(subject);

	return reader(subject);
};

export { dispatchOn };
