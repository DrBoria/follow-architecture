"use strict";

// The vocabulary of a finding: message, repairs, and the ids the picture
// uses. The only place that writes prose about a violation.

const { describe, TYPES } = require("./decision-maker");
const ids = require("./vocabulary/ids");
const wrongAction = require("./types/wrongAction");

/**
 * A finding that arrives WITHOUT a tree (the CLI text, a linter message): the
 * engine already sent the token, so the same words are produced from it alone.
 * Returns `null` when the token is not a relation verdict.
 */
const renderToken = (token, ctx) => {
	if (!token || token.code !== "relation.forbidden") return null;
	return wrongAction.describeToken(token, ctx);
};

module.exports = { describe, renderToken, ids, TYPES };
