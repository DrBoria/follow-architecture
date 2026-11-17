"use strict";

// Plain CSS. The reference provider: it is only a parser plus the shared
// document reading, so everything it reports is available to every other syntax.

const postcss = require("postcss");
const { documentFacts } = require("../document");

const parse = (text) => postcss.parse(text, { from: undefined });

module.exports = {
	id: "css",
	exts: [".css"],
	parse,
	facts: (text, options = {}) => documentFacts(text, { ...options, parse, syntax: "css" }),
};
