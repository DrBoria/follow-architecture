import { describe, expect, it } from "vitest";
import { Node, SyntaxKind, type SourceFile } from "ts-morph";
import { createTsProject, loadSourceFile } from "../../entities/ast";
import * as css from "../../css";
import { expressionNodesOf } from "../../css/styled/template";
import { scopeFromFacts, scopeFromSourceFile } from "../../css/core/scope";
import { mergeScopes, resolveDeclaration, withProviders } from "../../css/resolve/resolve";
import type { ProviderLiteral } from "../../css/core/scope-types";

// The value resolver is a FACT producer: it walks a declaration value to the
// concrete text(s) it reaches — through `${…}`, `var()`, `$var` and `calc()` —
// and asks css-tree's grammar whether that text is legal. These tests are the
// mixed cases the resolver exists for, not a vocabulary: no test names a
// property list or a value list, and every expected value is what the source
// actually reaches.
//
// Providers are now explicit (which literals are providers is a ROLE question):
// this helper reads every object-literal variable in a file as a provider, which
// is what these fixtures spell their themes as.
const unwrapLiteral = (node: Node): Node => {
	let current = node;
	for (;;) {
		if (Node.isAsExpression(current) || Node.isSatisfiesExpression(current) || Node.isParenthesizedExpression(current) || Node.isNonNullExpression(current)) {
			current = current.getExpression();
			continue;
		}

		return current;
	}
};

const providersOf = (sf: SourceFile): ProviderLiteral[] => {
	const out: ProviderLiteral[] = [];
	for (const declaration of sf.getVariableDeclarations()) {
		const initializer = declaration.getInitializer();
		if (!initializer) continue;
		const node = unwrapLiteral(initializer);
		if (Node.isObjectLiteralExpression(node)) out.push({ name: declaration.getNameNode().getText(), node });
	}

	return out;
};

const templateOf = (code: string) => {
	const sf = loadSourceFile(createTsProject(), "a/box.tsx", code);
	const [node] = sf.getDescendantsOfKind(SyntaxKind.TaggedTemplateExpression);

	return { sf, node, facts: css.templateFacts(node, { providers: providersOf(sf) }) };
};

const declaration = (facts: ReturnType<typeof css.templateFacts>, prop: string) => {
	const found = facts.declarations.find((decl) => decl.prop === prop && decl.resolution);
	if (!found?.resolution) throw new Error(`no resolved declaration for \`${prop}\``);

	return found.resolution;
};

describe("css — value resolution to the bottom", () => {
	it("a complex property through a styled expression → a css variable → a theme value", () => {
		const { facts } = templateOf(`
const palette = { shadows: { card: 'var(--shadow-card)' } };
const Box = styled.div\`
  --shadow-card: 0 2px 4px rgba(0, 0, 0, 0.3);
  box-shadow: \${({ theme }) => theme.shadows.card};
\`;
`);

		const resolution = declaration(facts, "box-shadow");
		expect(resolution.rawValue).toContain("theme.shadows.card");
		expect(resolution.resolvedValues).toEqual([
			{ value: "0 2px 4px rgba(0, 0, 0, 0.3)", provider: null, mediaVariant: null, valid: true, problems: [] },
		]);
		expect(resolution.unresolved).toEqual([]);
	});

	it("one calc mixing a styled expression, a css variable and an scss variable", () => {
		const SCSS = "$gap: 4px;";
		const CODE = `
const base = { spacing: 8 };
const Box = styled.div\`
  --x: \${({ theme }) => theme.spacing}px;
  width: calc(var(--x) + \${({ theme }) => theme.spacing}px + $gap);
\`;
`;
		const { sf, node, facts } = templateOf(CODE);
		const scssFacts = css.stylesheetFacts("a/tokens.scss", SCSS);
		expect(scssFacts).not.toBeNull();
		const scope = withProviders(mergeScopes(scopeFromSourceFile(sf), scopeFromFacts(scssFacts!)), providersOf(sf));
		const nodes = expressionNodesOf(node.getTemplate());
		const width = facts.declarations.find((decl) => decl.prop === "width");
		expect(width).toBeDefined();

		const resolution = resolveDeclaration(width!, { scope, expression: (index) => nodes[index] ?? null });
		expect(resolution.resolvedValues).toEqual([{ value: "calc(8px + 8px + 4px)", provider: null, mediaVariant: null, valid: true, problems: [] }]);
		expect(resolution.unresolved).toEqual([]);
	});

	it("an undeclared css variable is reported, not skipped", () => {
		const { facts } = templateOf(`
const Box = styled.div\`
  padding: var(--missing);
\`;
`);

		const resolution = declaration(facts, "padding");
		expect(resolution.resolvedValues).toEqual([]);
		expect(resolution.unresolved.map((item) => item.kind)).toEqual(["undeclared-var"]);
		expect(resolution.unresolved[0].name).toBe("--missing");
	});

	it("a broken calc is invalid, though the property grammar alone accepts it", () => {
		const { facts } = templateOf(`
const Box = styled.div\`
  width: calc(2+);
\`;
`);

		const resolution = declaration(facts, "width");
		expect(resolution.resolvedValues).toHaveLength(1);
		expect(resolution.resolvedValues[0].value).toBe("calc(2+)");
		expect(resolution.resolvedValues[0].valid).toBe(false);
		expect(resolution.resolvedValues[0].problems[0].kind).toBe("math");
		expect(resolution.resolvedValues[0].problems[0].span).toEqual({ start: 0, end: 8 });
	});

	it("var() uses its fallback when the variable is undeclared", () => {
		const { facts } = templateOf(`
const Box = styled.div\`
  padding: var(--missing, 8px);
\`;
`);

		const resolution = declaration(facts, "padding");
		expect(resolution.resolvedValues).toEqual([{ value: "8px", provider: null, mediaVariant: null, valid: true, problems: [] }]);
		expect(resolution.unresolved).toEqual([]);
	});

	it("var() ignores its fallback when the variable IS declared", () => {
		const { facts } = templateOf(`
const Box = styled.div\`
  --gap: 12px;
  padding: var(--gap, 8px);
\`;
`);

		const resolution = declaration(facts, "padding");
		expect(resolution.resolvedValues.map((item) => item.value)).toEqual(["12px"]);
	});

	it("media variants of one variable resolve to one reading each", () => {
		const { facts } = templateOf(`
const Box = styled.div\`
  --gap: 8px;
  @media (min-width: 900px) { --gap: 16px; }
  padding: var(--gap);
\`;
`);

		const resolution = declaration(facts, "padding");
		const readings = resolution.resolvedValues.map((item) => [item.value, item.mediaVariant]).sort();
		expect(readings).toEqual([
			["16px", "@media (min-width: 900px)"],
			["8px", null],
		]);
		expect(resolution.resolvedValues.every((item) => item.valid === true)).toBe(true);
	});

	it("the same declaration is valid in one theme and invalid in another", () => {
		const { facts } = templateOf(`
const viking = { effects: { texture: { backgroundImage: 'url(noise.png)' } } };
const liquidGlass = { effects: { texture: { backgroundImage: 'blur(10px)' } } };
const Box = styled.div\`
  background-image: \${({ theme }) => theme.effects.texture.backgroundImage};
\`;
`);

		const resolution = declaration(facts, "background-image");
		const readings = resolution.resolvedValues.map((item) => [item.provider, item.value, item.valid]).sort();
		expect(readings).toEqual([
			["liquidGlass", "blur(10px)", false],
			["viking", "url(noise.png)", true],
		]);
		expect(resolution.unresolved).toEqual([]);
	});

	it("an expression that is not statically resolvable is reported", () => {
		const { facts } = templateOf(`
declare const compute: () => string;
const Box = styled.div\`
  padding: \${compute()};
\`;
`);

		const resolution = declaration(facts, "padding");
		expect(resolution.resolvedValues).toEqual([]);
		expect(resolution.unresolved[0].kind).toBe("call");
	});

	it("a plain SCSS document resolves its own $variables and custom properties", () => {
		const facts = css.stylesheetFacts("a/theme.scss", "$gap: 4px;\n.a { --x: $gap; padding: var(--x); }");
		expect(facts).not.toBeNull();
		const padding = facts!.declarations.find((decl) => decl.prop === "padding");
		expect(padding?.resolution?.resolvedValues).toEqual([{ value: "4px", provider: null, mediaVariant: null, valid: true, problems: [] }]);
	});

	it("a plain CSS document validates a typed value generically", () => {
		const facts = css.stylesheetFacts("a/reset.css", ".a { padding: 10; background-image: blur(4px); }");
		expect(facts).not.toBeNull();
		const [padding, background] = facts!.declarations.filter((decl) => decl.resolution);
		expect(padding.resolution?.resolvedValues[0].valid).toBe(false);
		expect(background.resolution?.resolvedValues[0].valid).toBe(false);
	});

	it("a nested block used as a value is a directive, not an unresolved value", () => {
		const sf = loadSourceFile(
			createTsProject(),
			"a/box.tsx",
			`const fragment = css\`
  color: red;
\`;
const Box = styled.div\`
  margin-right: 0 \${fragment};
\`;`,
		);
		const templates = sf.getDescendantsOfKind(SyntaxKind.TaggedTemplateExpression);
		const facts = css.templateFacts(templates[templates.length - 1], { providers: providersOf(sf) });

		const resolution = declaration(facts, "margin-right");
		// The block contributes no TEXT to the value: what remains ("0") is the
		// value, and the block's own declarations are read where it is written.
		expect(resolution.resolvedValues.map((item) => item.value)).toEqual(["0"]);
		expect(resolution.unresolved).toEqual([]);
	});

	// The REAL shape of `packages/styles`: a theme is composed from imported
	// parts — a default-exported offsets object spread into `variables.offsets`,
	// a rhythm computed from an origin (`basicOffset * 2`), a screen height that
	// points at another local object (`height: screens.tabletHeight`). The
	// resolver must follow all of these to the concrete number.
	const themeProject = () => {
		const project = createTsProject();
		loadSourceFile(
			project,
			"/repo/themes/offsets.ts",
			`export const basicOffset = 8;
export default {
  section: { mobile: basicOffset, tablet: basicOffset * 2, desktop: basicOffset * 4 },
  betweenElements: { mobile: basicOffset, tablet: basicOffset, desktop: basicOffset * 2 },
};`,
		);
		loadSourceFile(
			project,
			"/repo/themes/elements.ts",
			`const elements = { header: { height: 'var(--height-header)' } };
export default elements;`,
		);
		loadSourceFile(
			project,
			"/repo/themes/base.ts",
			`import offsets from "./offsets";
import elements from "./elements";
const screens = { tabletHeight: 720, tabletWidth: 600 };
const base = {
  variables: { offsets: { ...offsets } },
  elements,
  screens: { tablet: { height: screens.tabletHeight, width: screens.tabletWidth } },
  offsets: { betweenElements: 'var(--offset-between-elements)' },
};
export default base;`,
		);

		return project;
	};

	const factsOf = (project: ReturnType<typeof createTsProject>, code: string) => {
		const sf = loadSourceFile(project, "/repo/component.tsx", code);
		const [node] = sf.getDescendantsOfKind(SyntaxKind.TaggedTemplateExpression);
		// The project's theme is the `base` literal; `elements`/`screens` are
		// PARTS of it, not providers, so passing them would report them absent.
		const providers = project
			.getSourceFiles()
			.flatMap(providersOf)
			.filter((provider) => provider.name === "base");

		return css.templateFacts(node, { providers });
	};

	it("a theme composed of imported parts: default export, spread and a computed rhythm", () => {
		const project = themeProject();
		const facts = factsOf(
			project,
			`const Box = styled.div\`
  gap: \${({ theme }) => theme.variables.offsets.betweenElements.desktop}px;
\`;`,
		);

		const resolution = declaration(facts, "gap");
		expect(resolution.resolvedValues.map((item) => item.value)).toEqual(["16px"]);
		expect(resolution.unresolved).toEqual([]);
	});

	// The three media variants of a numeric theme path, and the element size a
	// component reads beside them — the exact probes that used to be reported as
	// "not statically resolvable" against the real `packages/styles` themes.
	it("every media variant of a themed offset and a themed element size resolves to a number", () => {
		const project = themeProject();
		const facts = factsOf(
			project,
			`const Box = styled.div\`
  gap: \${({ theme }) => theme.variables.offsets.betweenElements.mobile}px;
  row-gap: \${({ theme }) => theme.variables.offsets.betweenElements.tablet}px;
  column-gap: \${({ theme }) => theme.variables.offsets.betweenElements.desktop}px;
  height: \${({ theme }) => theme.elements.header.height};
\`;`,
		);

		expect(declaration(facts, "gap").resolvedValues.map((item) => item.value)).toEqual(["8px"]);
		expect(declaration(facts, "row-gap").resolvedValues.map((item) => item.value)).toEqual(["8px"]);
		expect(declaration(facts, "column-gap").resolvedValues.map((item) => item.value)).toEqual(["16px"]);
		// `elements.header.height` is `var(--height-header)`; with no provider in
		// this fixture the VARIABLE is genuinely unresolved — the point is that
		// the `theme.elements.header.height` path itself is read, not reported as
		// "not statically resolvable".
		expect(declaration(facts, "height").unresolved.map((item) => item.kind)).toEqual(["undeclared-var"]);
	});

	it("a theme path through a local member and a spread resolves, not reports", () => {		const project = themeProject();
		const facts = factsOf(
			project,
			`const Box = styled.div\`
  height: \${({ theme }) => theme.screens.tablet.height}px;
  padding: \${({ theme }) => theme.offsets.betweenElements};
\`;`,
		);

		expect(declaration(facts, "height").resolvedValues.map((item) => item.value)).toEqual(["720px"]);
		// No `--offset-between-elements` is declared here, so the variable is
		// genuinely unresolved — the point is that the THEME PATH itself resolved.
		expect(declaration(facts, "padding").unresolved.map((item) => item.kind)).toEqual(["undeclared-var"]);
	});

	it("a calc over a theme number and a themed CSS variable resolves to one concrete reading", () => {
		const project = themeProject();
		loadSourceFile(
			project,
			"/repo/themes/provider.tsx",
			`const Media = styled.div\`
  @media (min-width: 600px) { --height-header: 100px; }
\`;`,
		);
		const facts = factsOf(
			project,
			`const Box = styled.div\`
  min-height: \${({ theme }) => \`calc(\${theme.screens.tablet.height}px - \${theme.elements.header.height})\`};
\`;`,
		);

		const resolution = declaration(facts, "min-height");
		expect(resolution.resolvedValues.map((item) => [item.value, item.mediaVariant, item.valid])).toEqual([["calc(720px - 100px)", "@media (min-width: 600px)", true]]);
		expect(resolution.unresolved).toEqual([]);
	});
});

// The two-sided resolution the settled model promises: a fallback COVERS a
// provider that lacks an optional key (a status map differs per theme by design),
// while a FIXED path missing in a provider blames that provider as incomplete.
describe("css — per-provider blame and status fallbacks", () => {
	it("an optional status read with a nullish fallback is legal in every provider", () => {
		const { facts } = templateOf(`
const viking = { colors: { section: '#111', sectionContent: '#eee', status: { ok: { background: '#0f0', content: '#000' } } } };
const minimal = { colors: { section: '#222', sectionContent: '#ddd', status: {} } };
const Badge = styled.span\`
  background: \${({ $status = "", theme }) => theme.colors.status?.[$status]?.background ?? theme.colors.section};
\`;
`);

		const resolution = declaration(facts, "background");
		// The fallback paints the providers the status key is missing in, so
		// NOTHING is reported absent.
		expect(resolution.unresolved).toEqual([]);
		expect(resolution.resolvedValues.map((item) => item.value).sort()).toEqual(["#111", "#222"]);
	});

	it("a fixed path a provider does not carry is blamed on the provider", () => {
		const { facts } = templateOf(`
const full = { colors: { section: '#111', highlighted: '#222' } };
const partial = { colors: { section: '#333' } };
const Title = styled.h2\`
  color: \${({ theme }) => theme.colors.highlighted};
\`;
`);

		const resolution = declaration(facts, "color");
		expect(resolution.resolvedValues.map((item) => item.value)).toEqual(["#222"]);
		expect(resolution.unresolved).toEqual([{ kind: "absent", text: expect.stringContaining("theme.colors.highlighted"), provider: "partial" }]);
	});
});

// A styled interpolation may BRANCH. The resolver does not pick a branch at
// runtime — it enumerates every reachable leaf and reports each as its own
// reading. A branch that genuinely cannot be read is reported NEXT TO the ones
// that resolved, never instead of them.
describe("css — branch enumeration", () => {
	const valuesOf = (facts: ReturnType<typeof css.templateFacts>, prop: string): string[] =>
		declaration(facts, prop)
			.resolvedValues.map((item) => item.value)
			.sort();

	it("a nested ternary enumerates every arm", () => {
		const { facts } = templateOf(`
const theme = { colors: { a: '#111', b: '#222', c: '#333' } };
const Box = styled.div\`
  color: \${({ $mode, theme }) => ($mode === 'a' ? theme.colors.a : $mode === 'b' ? theme.colors.b : theme.colors.c)};
\`;
`);

		expect(valuesOf(facts, "color")).toEqual(["#111", "#222", "#333"]);
		expect(declaration(facts, "color").unresolved).toEqual([]);
	});

	it("prop-indexed theme object enumerates every member", () => {
		const { facts } = templateOf(`
const theme = { zIndex: { modal: 1000, dropdown: 100, content: 1 } };
const Box = styled.div\`
  z-index: \${({ $zIndex, theme }) => ($zIndex ? theme.zIndex[$zIndex] : theme.zIndex.content)};
\`;
`);

		const resolution = declaration(facts, "z-index");
		expect(resolution.resolvedValues.map((item) => item.value).sort()).toEqual(["1", "100", "1000"]);
		expect(resolution.resolvedValues.every((item) => item.valid !== false)).toBe(true);
		expect(resolution.unresolved).toEqual([]);
	});

	it("map over a static array literal enumerates its elements", () => {
		const { facts } = templateOf(`
const Box = styled.div\`
  margin-left: \${["4px", "8px"].map((m) => m)};
\`;
`);

		expect(valuesOf(facts, "margin-left")).toEqual(["4px", "8px"]);
	});

	it("map joined over a static array literal folds to one reading", () => {
		const { facts } = templateOf(`
const Box = styled.div\`
  grid-template-columns: \${[1, 2, 3].map((n) => \`\${n}fr\`).join(" ")};
\`;
`);

		expect(valuesOf(facts, "grid-template-columns")).toEqual(["1fr 2fr 3fr"]);
	});

	it("a ternary mixing a calc branch and a plain branch reads both", () => {
		const { facts } = templateOf(`
const theme = { offsets: { small: 4, large: 16 } };
const Box = styled.div\`
  padding: \${({ $large, theme }) => ($large ? \`calc(\${theme.offsets.large}px * 2)\` : \`\${theme.offsets.small}px\`)};
\`;
`);

		expect(valuesOf(facts, "padding")).toEqual(["4px", "calc(16px * 2)"]);
		expect(declaration(facts, "padding").unresolved).toEqual([]);
	});

	it("a runtime branch is reported beside the branch that resolved", () => {
		const { facts } = templateOf(`
declare const compute: () => string;
const Box = styled.div\`
  padding: \${({ $x }) => ($x ? compute() : "4px")};
\`;
`);

		const resolution = declaration(facts, "padding");
		expect(resolution.resolvedValues.map((item) => item.value)).toEqual(["4px"]);
		expect(resolution.unresolved).toHaveLength(1);
		expect(resolution.unresolved[0].kind).toBe("call");
	});
});

// Runtime data is not a broken value: a prop or a computed local has a SHAPE we
// can check and a value we cannot. A valid shape is silent; an invalid one is
// not blamed on the component. A static branch beside it is still judged.
describe("css — runtime values keep their shape", () => {
	const valuesOf = (facts: ReturnType<typeof css.templateFacts>, prop: string): string[] => declaration(facts, prop).resolvedValues.map((item) => item.value);

	it("every leaf of a 3-deep ternary is checked: one invalid leaf fires", () => {
		const { facts } = templateOf(`
const Box = styled.div\`
  width: \${({ $m }) => ($m === 'a' ? '4px' : $m === 'b' ? '8px' : $m === 'c' ? '12px' : 'red')};
\`;
`);

		const resolution = declaration(facts, "width");
		expect(resolution.resolvedValues.map((item) => [item.value, item.valid])).toEqual([
			["4px", true],
			["8px", true],
			["12px", true],
			["red", false],
		]);
	});

	it("all leaves valid → silent", () => {
		const { facts } = templateOf(`
const theme = { offsets: { a: 4, b: 8, c: 16 } };
const Box = styled.div\`
  padding: \${({ $m, theme }) => ($m === 'a' ? \`\${theme.offsets.a}px\` : $m === 'b' ? \`\${theme.offsets.b}px\` : \`\${theme.offsets.c}px\`)};
\`;
`);

		const resolution = declaration(facts, "padding");
		expect(resolution.resolvedValues.map((item) => [item.value, item.valid])).toEqual([
			["4px", true],
			["8px", true],
			["16px", true],
		]);
		expect(resolution.unresolved).toEqual([]);
	});

	it("a dynamic prop inside a template is checked by its shape, not reported", () => {
		const { facts } = templateOf(`
const Box = styled.div\`
  width: \${({ $percentage }) => $percentage}%;
\`;
`);

		const resolution = declaration(facts, "width");
		expect(resolution.resolvedValues.map((item) => item.valid)).toEqual([true]);
		expect(resolution.unresolved).toEqual([]);
	});

	it("a bare dynamic prop is silent (its value is the runtime's)", () => {
		const { facts } = templateOf(`
const Box = styled.div\`
  background-color: \${({ $color }) => $color};
\`;
`);

		const resolution = declaration(facts, "background-color");
		expect(resolution.resolvedValues).toEqual([]);
		expect(resolution.unresolved).toEqual([]);
	});

	it("map over a dynamic collection folds its template shape", () => {
		const { facts } = templateOf(`
const Box = styled.div\`
  grid-template-columns: \${({ $ratio }) => $ratio.map((n) => \`\${n}fr\`).join(" ")};
\`;
`);

		const resolution = declaration(facts, "grid-template-columns");
		expect(resolution.resolvedValues.map((item) => item.valid)).toEqual([true]);
		expect(resolution.unresolved).toEqual([]);
	});

	it("map over a dynamic collection whose shape does not fit the property is not blamed", () => {
		const { facts } = templateOf(`
const Box = styled.div\`
  grid-template-columns: \${({ $ratio }) => $ratio.map((col) => \`\${col}\`).join(" ")};
\`;
`);

		const resolution = declaration(facts, "grid-template-columns");
		expect(resolution.unresolved).toEqual([]);
	});

	it("&& and || read both alternatives, the static one still judged", () => {
		const and = templateOf(`
const theme = { colors: { a: '#111' } };
const Box = styled.div\`
  color: \${({ $x, theme }) => $x && theme.colors.a};
\`;
`);
		const or = templateOf(`
const theme = { colors: { a: '#111' } };
const Box = styled.div\`
  color: \${({ $x, theme }) => $x || theme.colors.a};
\`;
`);
		for (const { facts } of [and, or]) {
			const resolution = declaration(facts, "color");
			expect(resolution.resolvedValues.map((item) => item.value)).toEqual(["#111"]);
			expect(resolution.unresolved).toEqual([]);
		}
	});

	it("arithmetic over a theme value folds to the concrete number", () => {
		const { facts } = templateOf(`
const theme = { offsets: { section: { mobile: 16 } } };
const Box = styled.div\`
  max-height: \${({ theme }) => theme.offsets.section.mobile * 2};
\`;
`);

		expect(valuesOf(facts, "max-height")).toEqual(["32"]);
	});
});

// The grammar's verdict is STRUCTURED: a reading that is rejected names the KIND
// of problem and the SPAN it occupies, so the report can highlight exactly the
// offending `calc(…)` or token. The math check is GENERIC — `min`/`max`/`clamp`
// are validated by the grammar of their own function type, not a list of names.
describe("css — structured verdicts and spans", () => {
	it("every math function is checked, not only calc", () => {
		const cases: [string, string][] = [
			["width", "calc(2+)"],
			["width", "min(2+)"],
			["width", "max(2+)"],
			["width", "clamp(1px)"],
		];
		for (const [prop, value] of cases) {
			const { facts } = templateOf(`const Box = styled.div\`\n  ${prop}: ${value};\n\`;`);
			const resolution = declaration(facts, prop);
			expect(resolution.resolvedValues[0].valid).toBe(false);
			expect(resolution.resolvedValues[0].problems[0].kind).toBe("math");
			expect(resolution.resolvedValues[0].problems[0].span).toEqual({ start: 0, end: value.length });
		}
	});

	it("a well-formed math function is valid", () => {
		const { facts } = templateOf(`
const Box = styled.div\`
  width: clamp(1px, 50%, 100px);
\`;
`);
		const resolution = declaration(facts, "width");
		expect(resolution.resolvedValues[0].valid).toBe(true);
		expect(resolution.resolvedValues[0].problems).toEqual([]);
	});

	it("a property mismatch carries the span of the offending token", () => {
		const facts = css.stylesheetFacts("a/bad.css", ".a { padding: 10pxpx; }");
		expect(facts).not.toBeNull();
		const padding = facts!.declarations.find((decl) => decl.prop === "padding");
		const problem = padding?.resolution?.resolvedValues[0].problems[0];
		expect(problem?.kind).toBe("property");
		// `10pxpx` is the whole value here; the grammar points the mismatch at it.
		expect(problem?.span).toEqual({ start: 0, end: 6 });
	});

	it("an unresolved variable names its kind and the variable", () => {
		const { facts } = templateOf(`
const Box = styled.div\`
  padding: var(--missing);
\`;
`);
		const unresolved = declaration(facts, "padding").unresolved[0];
		expect(unresolved.kind).toBe("undeclared-var");
		expect(unresolved.name).toBe("--missing");
	});

	it("an empty value is the `empty` kind, not prose", () => {
		const facts = css.stylesheetFacts("a/empty.css", ".a { color: ; }");
		const color = facts?.declarations.find((decl) => decl.prop === "color");
		const kinds = color?.resolution?.unresolved.map((item) => item.kind) ?? [];
		expect(kinds).toContain("empty");
	});
});

