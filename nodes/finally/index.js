"use strict";

// finally-follow-architecture: the built-in structure rule. Four questions,
// one module each, no wording (that lives in report/errorTypes).

const { fillTemplate } = require("../../entities/location");
const { deepestMatch } = require("../../entities/tree");
const { missingRequiredChild } = require("../children");
const { EDGE_FACTS } = require("../../entities/kinds");

const { fitsRole } = require("./roles");
const { checkRequiredChildren } = require("./required");
const { checkChildQueries } = require("./queries");
const { checkRelations } = require("./relations");
const { emitFindings } = require("./emit");

const checkFinally = (ctx, arch, out, findingFrom) => {
	const match = deepestMatch(ctx.rel, arch);
	if (!match) return;
	const node = match.node;

	const violations = [];

	checkRequiredChildren(ctx, arch, node, out, findingFrom);
	checkChildQueries(ctx, node, violations);
	checkRelations(ctx, arch, violations);
	emitFindings(violations, ctx, node, out, findingFrom);
};

module.exports = {
	checkFinally,
	fitsRole,
	missingRequiredChild: (node, arch, rel, files) => missingRequiredChild(node, arch, rel, files, fillTemplate),
	EDGE_FACTS,
};
