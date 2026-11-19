"use strict";

// A QUALIFIED READ is one mechanism: a subject must first qualify as the kind
// of thing a reader understands, and only then is it read — otherwise the
// answer is a stated fallback, never a guess. The filter engine's `where`
// reads its expected value only when it is a record (`entities/queries`); the
// CSS content gate reads a document only when the syntax's parser accepts the
// text (`css/syntax/gate`). The walk is the same — qualify, then read, else
// fall back — so it lives here once. What "qualifies" means, how the subject is
// read and what the fallback is are the caller's own.

const readWhen = <Subject, Answer>(
	subject: Subject | null | undefined,
	qualifies: (subject: Subject | null | undefined) => boolean,
	read: (subject: Subject) => Answer,
	fallback: Answer,
): Answer => {
	if (subject == null || !qualifies(subject)) return fallback;

	return read(subject);
};

export { readWhen };
