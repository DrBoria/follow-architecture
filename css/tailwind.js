"use strict";

// Tailwind is CSS written in an attribute: `className="flex p-4 text-sm"` is a
// declaration list that happens to live in a string. So it is read here, in the
// CSS facet, and not by the React facet — a Vue template has the same attribute
// and must produce the same facts.
//
// What is read is deliberately structural, not a Tailwind build:
//   variant  `md:hover:` — the conditions the utility applies under
//   utility  `p-4` — the part that names the property
//   value    `4` — with `[13px]` kept as `arbitrary`, because an arbitrary value
//            is exactly the hardcoded literal a design system wants to own
//   kind     which family of properties it touches (`spacing`, `colour`, …), so a
//            rule can say "no colour utilities in a feature folder" without the
//            engine knowing Tailwind's tables.

const { classList, hostOf } = require("./index");

// Family by prefix. A utility that matches nothing is `other`, never dropped:
// silence would look like "no findings".
const FAMILIES = [
	["colour", /^(bg|text|border|ring|fill|stroke|shadow|from|via|to|outline|decoration|caret|accent|divide|placeholder)-/],
	["spacing", /^(p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap|gap-x|gap-y|space-x|space-y)-/],
	["layout", /^(flex|grid|block|inline|hidden|absolute|relative|fixed|sticky|static|container|columns|float|clear|object|overflow|overscroll|isolate|z|order|basis|grow|shrink|top|right|bottom|left|inset)-?/],
	["typography", /^(font|text|leading|tracking|indent|align|whitespace|break|truncate|uppercase|lowercase|capitalize|italic|antialiased|underline|line-through|no-underline|list)-?/],
	["size", /^(w|h|min-w|min-h|max-w|max-h|size|aspect)-/],
	["effect", /^(rounded|border|ring|shadow|opacity|blur|brightness|contrast|grayscale|invert|saturate|sepia|backdrop|transition|duration|delay|ease|animate|transform|scale|rotate|translate|skew|origin|cursor|select|pointer-events|resize|scroll|snap|touch|will-change)-/],
];

const familyOf = (utility) => {
	for (const [family, pattern] of FAMILIES) if (pattern.test(utility)) return family;

	return "other";
};

// `md:hover:p-[13px]` → { raw, variants: ["md","hover"], utility: "p-[13px]", base: "p", value: "13px", arbitrary: true, kind: "spacing" }
const utilityFacts = (raw) => {
	const parts = String(raw).split(":");
	const variants = parts.slice(0, -1);
	const utility = parts[parts.length - 1] ?? "";
	const arbitraryMatch = utility.match(/^(.*?)-\[(.+)\]$/);
	const dashIndex = utility.indexOf("-");
	const base = dashIndex === -1 ? utility : utility.slice(0, dashIndex);
	const value = arbitraryMatch ? arbitraryMatch[2] : dashIndex === -1 ? null : utility.slice(dashIndex + 1);

	return {
		raw: String(raw),
		variants,
		utility,
		base,
		value,
		arbitrary: Boolean(arbitraryMatch),
		// A negative utility (`-mt-2`) is still spacing.
		kind: familyOf(utility.replace(/^-/, "")),
	};
};

const classFacts = (text) => classList(text).map(utilityFacts);

// The classes of one markup node, attached to the piece that declares it — the
// same ownership rule the styled templates use, so a nested component's classes
// stay its own.
const attachClasses = (candidates, { sf }) => {
	const { SK } = require("../entities/ast/tree");

	for (const attribute of sf.getDescendantsOfKind(SK.JsxAttribute)) {
		const name = attribute.getNameNode?.()?.getText?.() ?? "";
		if (name !== "className" && name !== "class") continue;

		const initializer = attribute.getInitializer?.();
		const literal = initializer?.getKind?.() === SK.StringLiteral ? initializer.getLiteralText?.() : null;
		// Only a static literal is a declaration list. `{cn(...)}` is code, and
		// guessing at it would invent facts.
		if (!literal) continue;

		const host = hostOf(candidates, attribute.getStartLineNumber?.() ?? null);
		if (!host) continue;

		host.css = host.css && Array.isArray(host.css.templates) ? host.css : (host.css ?? {});
		host.css.classes = [...(host.css.classes ?? []), ...classFacts(literal)];
	}

	return candidates;
};

module.exports = { classFacts, utilityFacts, familyOf, attachClasses };
