"use strict";

// The vocabulary of a finding: message, repairs, and the ids the picture
// uses. The only place that writes prose about a violation.

import { describe, TYPES } from "./decision-maker";
import * as ids from "./vocabulary/ids";
import * as wrongAction from "./types/wrongAction";
import type { FieldValue } from "../../utils/field";

// A relation verdict token, and the free-form scope a finding is rendered in.
type Token = { code?: string };
type RenderCtx = Record<string, FieldValue>;

/**
 * A finding that arrives WITHOUT a tree (the CLI text, a linter message): the
 * engine already sent the token, so the same words are produced from it alone.
 * Returns `null` when the token is not a relation verdict.
 */
const renderToken = (token: Token | null | undefined, ctx: RenderCtx): ReturnType<typeof wrongAction.describeToken> => {
	if (!token || token.code !== "relation.forbidden") return null;
	return wrongAction.describeToken(token, ctx);
};

export { describe, renderToken, ids, TYPES };
