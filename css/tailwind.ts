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

import { classList } from "./class-list";
import { notice } from "../report/notices";
import { reasonOf } from "../utils/reason";
import { partsOf } from "../utils/split";
import { baseConfig, loadSetup, loadGenerate, loadVersion, type TailwindContext } from "./tailwind-engine";

// The loaded engine, or `false` when Tailwind is absent, or `null` before the
// first ask. `null` means "not installed", and then every fact below is UNKNOWN —
// never a guess, because silence that looks like knowledge is worse than no answer.
// The properties reader's shape is derived from its ONE producer below.
type Engine = { version: string; propertiesOf: ReturnType<typeof propertiesReader> };
let loaded: Engine | false | null = null;

// What a token SETS, read off the CSS Tailwind generated for it. Declarations
// only — `@media (min-width: …)` is a condition, not a property the utility
// assigns. One cache per run: the same class is read hundreds of times.
const propertiesReader = (context: TailwindContext): ((candidate: string) => string[]) => {
	const generate = loadGenerate();
	const cache = new Map<string, string[]>();

	return (candidate) => {
		const cached = cache.get(candidate);
		if (cached) return cached;

		let properties: string[] = [];
		try {
			const props = new Set<string>();
			for (const [, rule] of generate.generateRules([candidate], context)) {
				rule.walkDecls((decl) => {
					props.add(decl.prop);
				});
			}
			properties = [...props].sort();
		} catch (error) {
			// A token Tailwind throws on is a token it does not know — said out loud,
			// because "no properties" and "could not ask" are different answers.
			const e: { message?: string } = error;
			notice(`the Tailwind class \`${candidate}\` could not be read`, reasonOf(e));
			properties = [];
		}
		cache.set(candidate, properties);

		return properties;
	};
};

const engine = (): Engine | false | null => {
	if (loaded !== null) return loaded;

	try {
		const context = loadSetup().createContext(baseConfig());
		loaded = { version: loadVersion(), propertiesOf: propertiesReader(context) };
	} catch (error) {
		// Every class fact below is UNKNOWN — never a guess — and the reason is
		// reported, so a silently empty class list cannot pass for a clean one.
		const e: { message?: string } = error;
		notice("Tailwind could not be loaded, so class facts are unknown", reasonOf(e));
		loaded = false;
	}

	return loaded;
};

// The value a utility names: an arbitrary `[13px]` is kept whole, a `p-4` gives
// `4`, a bare `flex` gives nothing. One helper, no nested ternary.
const utilityValue = (utility: string, arbitrary: string | null, dashIndex: number): string | null => {
	if (arbitrary !== null) return arbitrary;
	if (dashIndex === -1) return null;

	return utility.slice(dashIndex + 1);
};

// `md:hover:p-[13px]` → { raw, variants: ["md","hover"], utility: "p-[13px]", base: "p", value: "13px", arbitrary: true, negative: false }
const structureOf = (raw: string): { raw: string; variants: string[]; utility: string; base: string; value: string | null; arbitrary: boolean; negative: boolean } => {
	const text = String(raw);
	// A class token is cut by `:` the same way a path is cut by `/` — the shared
	// split core; the parts before the last are the variants, the last is the utility.
	const { head: variants, last: utility } = partsOf(text, ":");
	const arbitraryMatch = utility.match(/^(.*?)-\[(.+)\]$/);
	const dashIndex = utility.indexOf("-");

	return {
		raw: text,
		variants,
		utility,
		base: dashIndex === -1 ? utility : utility.slice(0, dashIndex),
		value: utilityValue(utility, arbitraryMatch ? arbitraryMatch[2] : null, dashIndex),
		arbitrary: Boolean(arbitraryMatch),
		negative: utility.startsWith("-"),
	};
};

// One token's structure — derived from its ONE producer, never a hand-written
// copy that could drift.
type ClassStructure = ReturnType<typeof structureOf>;

// One token as a fact. `known` is `null` when Tailwind is absent — the
// difference between "not a Tailwind class" and "nobody asked Tailwind".
const utilityFacts = (raw: string): ClassStructure & { known: boolean | null; properties: string[] } => {
	const structure = structureOf(raw);
	const tailwind = engine();
	if (!tailwind) return { ...structure, known: null, properties: [] };

	const properties = tailwind.propertiesOf(structure.raw);

	return { ...structure, known: properties.length > 0, properties };
};

// The fact shape, derived from its ONE producer.
type ClassFact = ReturnType<typeof utilityFacts>;

const classFacts = (text: string | null | undefined): ClassFact[] => classList(text).map(utilityFacts);

const resetEngine = (): void => {
	loaded = null;
};

export { classFacts, utilityFacts, structureOf, engine, resetEngine };
export type { ClassFact, ClassStructure };
