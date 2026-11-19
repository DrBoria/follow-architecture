"use strict";

// A QUALIFIED ANSWER is one mechanism: a subject must pass every guard before
// it earns an answer; the first guard that refuses ends the question with
// nothing. A misfit role is a named candidate of a declared role with homes
// that sits outside them (`pipeline-roles`); a scope accessor is a record whose
// scope is one of the declared kinds (`code-roles/roles`). The walk is the same
// — ask each guard in order, answer only when all pass — so it lives here once.
// What the guards ARE and what the answer is is the caller's own; nothing here
// knows roles or accessors.

// The answer when every guard passes; null the moment one refuses. Guards are
// asked in order, so a cheap refusal short-circuits the rest.
const answerWhenAllPass = <Subject, Answer>(subject: Subject, guards: readonly ((subject: Subject) => boolean)[], answer: (subject: Subject) => Answer): Answer | null => {
	for (const guard of guards) {
		if (!guard(subject)) return null;
	}

	return answer(subject);
};

export { answerWhenAllPass };