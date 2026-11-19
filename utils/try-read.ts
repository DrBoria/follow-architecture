"use strict";

// A GUARDED READ is one mechanism: a reader may fail on a subject it cannot
// read, and the answer then is a stated fallback — never a crash, never a
// guess. The CSS content gate reads a document through a parser that throws on
// SQL or prose (`css/syntax/gate`); the document reader reads text through the
// syntax's own parser (`css/document`). The walk is the same — try the read,
// on failure take the fallback — so it lives here once. What is read, what the
// fallback is, and whether the failure is also REPORTED are the caller's own.

// Read `subject`, or take the fallback when the read throws. `onError` is the
// caller's voice: a gate stays silent (a non-CSS template is normal), a document
// reader reports (a stylesheet nobody can parse must not pass for a clean one).
const readOrFallback = <Subject, Answer>(
	subject: Subject,
	read: (subject: Subject) => Answer,
	fallback: Answer,
	onError?: (error: { message?: string }) => void,
): Answer => {
	try {
		return read(subject);
	} catch (error) {
		const e: { message?: string } = error;
		onError?.(e);

		return fallback;
	}
};

export { readOrFallback };
