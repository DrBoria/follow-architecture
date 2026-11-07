"use strict";

// A file that matches a declared child's query but sits outside it.

const { matches } = require("../../entities/queries");
const { nodePrefixRe } = require("../children");
const { fillTemplate } = require("../../entities/location");

const checkChildQueries = (ctx, node, violations) => {
	for (const child of node.children) {
		if (!child.query) continue;
		if (!matches(ctx.facts, child.query)) continue;
		const childPath = node.path === "." ? child.name : `${node.path}/${child.name}`;
		const { re } = nodePrefixRe(childPath);
		if (re.test(ctx.rel)) continue; // already in the right place
		const where = fillTemplate(node.path === "." ? child.name : `${node.path}/${child.name}`, ctx.rel);
		violations.push({ line: 1, text: `this file matches the query of node \`${child.slug ?? child.name}\` and belong in \`${where}\`` });
	}

};

module.exports = { checkChildQueries };
