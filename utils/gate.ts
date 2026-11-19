"use strict";

// A GATE is one mechanism: a subject is admitted when NONE of the rejection
// verdicts fires. The CSS content gate rejects a document with no structure, a
// data-format selector, or no grammar-known property (`css/syntax/css`); the AST
// read gate rejects a member access that is an inner hop, a write target or an
// operand (`entities/ast/properties`). The decision is the same — run every
// verdict, admit only when all pass — so it lives here once. What counts as a
// rejection is the caller's own policy; nothing here knows CSS or the AST.

const admitsWhenNoneReject = <Subject>(subject: Subject, rejects: readonly ((subject: Subject) => boolean)[]): boolean =>
	!rejects.some((reject) => reject(subject));

export { admitsWhenNoneReject };
