"use strict";

// THE SHAPE OF THE FACTS. Every producer in `entities/ast` writes one of these
// shapes; every consumer (queries, location, nodes, invariants, report) reads
// them through it. They are plain data — object type aliases, so a fact is
// assignable to the `FieldValue` model the filter engine walks, and no consumer
// ever meets an untyped value.
//
// Nullability is not repeated on optionals: the renderer reads a missing field
// and an absent one the same way, so the shapes stay data-first.

import type { FieldValue } from "../utils/field";
import type { ClassFact } from "../css/tailwind/tailwind";

// What every facet of "what is this node" answers: `{ is, name, line }`.
// The `name`/`line` pair is shared by every located facet.
type Located = { name?: string | null; line?: number };
type Descriptor = Located & { is: string };

// A member of an object literal or an inline type: its name, its kind, its
// declared type, and — when the initializer is a literal — the VALUE written.
type MemberFact = {
	name: string | null;
	is: string;
	type?: string | null;
	value?: string | number | null;
	members?: MemberFact[];
};

// One member of anything with members — object literal, inline shape, enum, or
// class body. It is `MemberFact` with every field made optional and the extra
// positions a class member may carry.
type AnyMember = Omit<Partial<MemberFact>, "members"> & {
	members?: AnyMember[];
	line?: number;
	private?: boolean;
	static?: boolean;
	readonly?: boolean;
	accessor?: boolean;
	visibility?: string | null;
	decorators?: DecoratorFact[];
};

// One node below its root, relative to it: the descriptor plus depth, text and
// the facets that particular node carries (`type` for a cast, `members` for an
// object literal, `nested` for a function/loop inside another).
type DescendantFact = Descriptor & {
	depth: number;
	snippet: string;
	type?: string | null;
	members?: MemberFact[];
	nested?: boolean;
};

// What a declaration is initialised with.
type Initializer = Pick<MemberFact, "is" | "members"> & {
	origin: string | null;
	value?: string | number;
};

// `x as Foo` / `x satisfies Foo` / `<Foo>x`.
type Assertion = { form: string; type: string | null; isConst: boolean };

// A decorator, by the NAME a filter matches (`Component`) and its full text.
type DecoratorFact = Located & { full: string; line: number; name: string | null };

// What a declaration is, spelled and situated: the node's own position in the
// tree plus the words on it (`modifiers`, `decorators`, `assertion`, `disposable`).
// Every facet is optional: a candidate that lacks one simply omits it (a
// comment's trivia kind answers `own` alone; `chain` is attached by the depth
// walk after collection) — the same data-first rule every other fact follows.
type KindFact = {
	own?: Descriptor;
	parent?: Descriptor | null;
	ancestors?: Descriptor[];
	children?: Descriptor[];
	siblings?: Descriptor[];
	descendants?: DescendantFact[];
	initializer?: Initializer | null;
	modifiers?: string[];
	decorators?: DecoratorFact[];
	assertion?: Assertion | null;
	disposable?: boolean;
	chain?: { name: string }[];
};

// One argument a call hands over, with the file declaring its type.
type ArgumentFact = { index: number; text: string; kind: string; root: string | null; type: string };

// A call the code makes.
type CallFact = {
	kind: string;
	origin: string | null;
	action: string | null;
	module: string | null;
	target: { path: string; name: string | null } | null;
	receiverOnly: boolean;
	bare: boolean;
	arguments: ArgumentFact[];
	// Attached by the connector: the role of the function the call targets.
	targetRole?: string | null;
};

// A value a function yields.
type ReturnFact = { kind: string; exprKind: string | null; origin: string | null; members: MemberFact[] };

// A field of a destructured parameter.
type BindingFact = { name: string | null; type: string | null; typeFile: string | null };

// One parameter of a function: a binding plus the call-side flags.
type ParameterFact = BindingFact & { name: string; optional: boolean; rest: boolean; bindings: BindingFact[] };

// One control-flow node a piece runs itself.
type BranchFact = Located & { is: string; line: number };

// One write — assignment, method call, delete, freeze — with where it lands.
type AssignmentFact = {
	line: number;
	target: string;
	method?: string | null;
	value?: string | null;
	via: string;
	performed?: boolean;
	type?: string | null;
	module?: string | null;
	param?: boolean;
	onThis?: boolean;
	local?: boolean;
	relation?: string | null;
};

// Who uses a published name.
type ReferencesFact = { total: number; outside: number; files: string[]; usedIn: string[] };

// Where a candidate sits.
type LocationFact = { path: string | null; piece: string | null; nested?: boolean };

// One constructor parameter of a class.
type ConstructorParam = { name: string; type: string | null; decorators: DecoratorFact[] };

// ── facet namespaces ─────────────────────────────────────────────────────────
// A facet attaches its own namespace to the candidates it understands; the core
// stays framework- and syntax-free. These are the STRUCTURAL shapes of those
// namespaces — plain data, so a candidate stays assignable to the `FieldValue`
// model the filter engine walks. The rich fact shapes live with their producers
// (`css/document`, `css/tailwind`, `frameworks/*`); a namespace carries them as
// lists of records, and a rule reads the fields it names.

// One CSS template's facts, as the candidate carries them: the document fact set
// plus the tag, the line, and the doc above it.
type CssTemplateFact = {
	tag?: string;
	line?: number | null;
	startLine?: number | null;
	comment?: { text: string; line: number | null } | null;
	declarations?: { readonly [key: string]: FieldValue }[];
	rules?: { readonly [key: string]: FieldValue }[];
	literals?: { readonly [key: string]: FieldValue }[];
	vars?: string[];
	exprs?: { readonly [key: string]: FieldValue }[];
	readonly [key: string]: FieldValue;
};

// One class token's facts, as the candidate carries them: the class-syntax
// provider's OWN reading (whatever it answers — a Tailwind utility today, any
// registered provider tomorrow) plus the attribute line it was written on.
// DERIVED from the one producer, so the fact shape can never drift from what
// the facet actually attaches. The open record keeps it plain data for the
// filter engine.
type CssClassFact = ClassFact & { line?: number | null; readonly [key: string]: FieldValue };

// The `css` namespace: templates read from tagged templates, classes read from
// attributes. Both are optional — a plain `.ts` file carries neither.
type CssFacts = { templates?: CssTemplateFact[]; classes?: CssClassFact[] };

// One JSX element a component renders, with the attributes and spreads it passes.
type JsxElementFact = {
	tag: string | null;
	line: number | null;
	attributes: { name: string; value: string | null }[];
	spreads: string[];
};

// One way a piece hands work to another: the target's name and, when it is
// imported, the module it is declared in (`null` means the same file). A
// rendered component and a called function are the SAME link shape — the depth
// walk follows either — so the type lives here once and `ast/depth` reuses it.
type Link = { name: string; module: string | null };

// The render-link alias kept for readers of the framework facts: the depth
// walk's link, supplied by the facet that knows the framework.
type RenderLink = Link;

// The `framework` namespace: what a component renders and hands down. Every
// framework attaches the same base; a framework that reads markup adds `jsx`
// and the `links` the depth walk follows.
type FrameworkFacts = {
	id: string;
	component: boolean;
	props: string[];
	forwarded: string[];
	jsx?: JsxElementFact[];
	links?: RenderLink[];
	// This piece is referenced by an event attribute (`onClick={close}`) — the
	// framework's convention, not a name list. A role infers from it like any fact.
	handler?: boolean;
};

// THE candidate: a piece of code a role classifies. Every field a producer may
// give is listed; a candidate that lacks one simply omits it.
type Candidate = {
	name?: string | null;
	location?: LocationFact;
	lines?: number[];
	kind?: KindFact;
	returns?: ReturnFact[];
	calls?: CallFact[];
	branches?: BranchFact[];
	assignments?: AssignmentFact[];
	parameters?: ParameterFact[];
	exported?: boolean;
	mutable?: boolean;
	references?: ReferencesFact | null;
	implementations?: number | null;
	members?: AnyMember[];
	staticBlocks?: number;
	extends?: string | null;
	implements?: string[];
	constructorParams?: ConstructorParam[];
	hasConstructor?: boolean;
	text?: string;
	role?: string | null;
	// Attached by the connector (classification) and the facets, not by the AST:
	parentRole?: string | null;
	css?: CssFacts;
	framework?: FrameworkFacts;
	file?: FileFacts;
};

// A leaf of a path: the file's own names.
type Leaf = { path: string; segments: string[]; exts: string[]; fileName: string; words: string[] };

// A place: a leaf plus the files in its folder and its siblings.
type Place = Leaf & { files: Leaf[]; siblings: Leaf[] };

// One way a module is brought in.
type ImportFact = {
	form: string;
	source: string | null;
	typeOnly?: boolean;
	named?: string[];
	line: number;
	piece?: string | null;
	resolved?: string | null;
	defaultName?: string;
	namespaceName?: string;
};

// One way code leaves the module — an import's shared fields plus what only an
// export names. `typeOnly` separates `export type … from` (erased at compile
// time, binds nothing at runtime) from a value re-export of the same shape.
type ExportFact = Pick<ImportFact, "form" | "source" | "line" | "piece" | "named" | "typeOnly"> & { from?: string | null; name?: string | null };

// One member of another module this file reads.
type ReadFact = { module: string; what: string; line: number; piece: string | null };

// A whole file's facts.
type FileFacts = {
	lines: number[];
	imports: ImportFact[];
	exports: ExportFact[];
	location: Place;
	reads: ReadFact[];
	kind: { own: Descriptor; descendants: DescendantFact[] };
	candidates: Candidate[];
	roles: string[];
};

export type {
	Located,
	Descriptor,
	MemberFact,
	AnyMember,
	DescendantFact,
	Initializer,
	Assertion,
	DecoratorFact,
	KindFact,
	ArgumentFact,
	CallFact,
	ReturnFact,
	BindingFact,
	ParameterFact,
	BranchFact,
	AssignmentFact,
	ReferencesFact,
	LocationFact,
	ConstructorParam,
	CssTemplateFact,
	CssClassFact,
	CssFacts,
	JsxElementFact,
	Link,
	RenderLink,
	FrameworkFacts,
	Candidate,
	Leaf,
	Place,
	ImportFact,
	ExportFact,
	ReadFact,
	FileFacts,
};
