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
//   properties what Tailwind's own generator says the class SETS
//            (`p-4` → `padding`), so "is this a colour utility" is a question
//            about facts, answered in the architecture config
//
// Updating Tailwind is `pnpm update`: new classes appear here by themselves,
// because nothing in this file enumerates them.

const { classList } = require("./index");
const { notice } = require("../report/notices");

// Tailwind itself, loaded on demand. Not a table of prefixes maintained here:
// the vocabulary changes every minor release, and a copy of it in this file
// would be wrong the day after it was written. `null` means "not installed", and
// then every fact below is UNKNOWN — never a guess, because silence that looks
// like knowledge is worse than no answer.
let loaded = null;

const engine = () => {
	if (loaded !== null) return loaded;

	try {
		const resolveConfig = require("tailwindcss/resolveConfig");
		const defaultConfig = require("tailwindcss/defaultConfig");
		const { createContext } = require("tailwindcss/lib/lib/setupContextUtils");
		const { generateRules } = require("tailwindcss/lib/lib/generateRules");
		const context = createContext(resolveConfig({ ...defaultConfig, content: { files: [] }, plugins: [] }));

		loaded = {
			version: require("tailwindcss/package.json").version,
			// One cache per run: the same class is read hundreds of times.
			cache: new Map(),
			// What a token SETS, read off the CSS Tailwind generated for it.
			// Declarations only — `@media (min-width: …)` is a condition, not a
			// property the utility assigns.
			propertiesOf(candidate) {
				if (this.cache.has(candidate)) return this.cache.get(candidate);

				let properties = [];
				try {
					const props = new Set();
					for (const [, rule] of generateRules([candidate], context)) rule.walkDecls((decl) => props.add(decl.prop));
					properties = [...props].sort();
				} catch (error) {
					// A token Tailwind throws on is a token it does not know — said out loud,
					// because "no properties" and "could not ask" are different answers.
					notice(`the Tailwind class \`${candidate}\` could not be read`, error && error.message ? error.message : String(error));
					properties = [];
				}
				this.cache.set(candidate, properties);

				return properties;
			},
		};
	} catch (error) {
		// Every class fact below is UNKNOWN — never a guess — and the reason is
		// reported, so a silently empty class list cannot pass for a clean one.
		notice("Tailwind could not be loaded, so class facts are unknown", error && error.message ? error.message : String(error));
		loaded = false;
	}

	return loaded;
};

// `md:hover:p-[13px]` → { raw, variants: ["md","hover"], utility: "p-[13px]", base: "p", value: "13px", arbitrary: true, negative: false }
const structureOf = (raw) => {
	const parts = String(raw).split(":");
	const variants = parts.slice(0, -1);
	const utility = parts[parts.length - 1] ?? "";
	const arbitraryMatch = utility.match(/^(.*?)-\[(.+)\]$/);
	const dashIndex = utility.indexOf("-");

	return {
		raw: String(raw),
		variants,
		utility,
		base: dashIndex === -1 ? utility : utility.slice(0, dashIndex),
		value: arbitraryMatch ? arbitraryMatch[2] : dashIndex === -1 ? null : utility.slice(dashIndex + 1),
		arbitrary: Boolean(arbitraryMatch),
		negative: utility.startsWith("-"),
	};
};

// One token as a fact. `known` is `null` when Tailwind is absent — the
// difference between "not a Tailwind class" and "nobody asked Tailwind".
const utilityFacts = (raw) => {
	const structure = structureOf(raw);
	const tailwind = engine();
	if (!tailwind) return { ...structure, known: null, properties: [] };

	const properties = tailwind.propertiesOf(structure.raw);

	return { ...structure, known: properties.length > 0, properties };
};

const classFacts = (text) => classList(text).map(utilityFacts);

module.exports = { classFacts, utilityFacts, structureOf, engine, resetEngine: () => (loaded = null) };
