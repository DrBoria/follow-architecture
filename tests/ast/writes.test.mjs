import { createRequire } from "node:module";
import { describe, expect, it, beforeAll } from "vitest";

const require = createRequire(import.meta.url);
const { createTsProject, loadSourceFile, collectFileFacts, collectCandidates, importNameModules } = require("../../entities/ast");

// A WRITE is not only `=`: any method that changes the value it is called on is
// one too — `push`, `splice`, `set`, `appendLine`, `sort` … The one thing that
// must not change the answer is HOW the value was obtained: a parameter, an
// import, an alias of a call, or the call itself (`getRootStore()?.channel?.appendLine(…)`).
// Every shape below is a write into the store, and every one of them was
// invisible before: the fact layer only followed NAMES to their root, and a
// call as the root was thrown away.
const STORE = `
export type Channel = { appendLine(line: string): void };
export type RootStore = { level: string; lines: string[]; channel?: Channel };
export const getRootStore = (): RootStore | undefined => undefined;
`;

const FILES = ["src/store.ts", "src/app.ts"];

let project;

beforeAll(() => {
	project = createTsProject();
});

const factsFor = (code) => {
	loadSourceFile(project, "src/store.ts", STORE);
	const sf = loadSourceFile(project, "src/app.ts", code);
	const importMap = importNameModules(sf, ".", {}, FILES);
	const candidates = collectCandidates(sf, importMap, "src/app.ts", ".");

	return collectFileFacts(sf, { rel: "src/app.ts", repoFiles: FILES, aliases: {}, repoRoot: ".", candidates });
};

const fn = (facts, name) => facts.candidates.find((c) => c.name === name && c.kind.own.is !== "VariableDeclaration");

// A write the architecture can read: it names the file the state lives in —
// through the declared TYPE (`s.level = …`) or through the MODULE whose call
// returned the value (`getRootStore().lines.push(…)`).
// The checker answers with an absolute path in the in-memory project and with a
// repo-relative one on disk — both spell the same file.
const isStore = (file) => typeof file === "string" && file.endsWith("src/store.ts");
const storeWrites = (facts, name) => fn(facts, name).assignments.filter((a) => isStore(a.type) || isStore(a.module));

describe("writes: a mutating method is a write, whatever the receiver is", () => {
	it("a method on a parameter: `state.lines.push(…)`", () => {
		const facts = factsFor(`
			import { type RootStore } from "./store";
			export const add = (state: RootStore, line: string): void => { state.lines.push(line); };
		`);

		expect(storeWrites(facts, "add")).toHaveLength(1);
	});

	it("a mutating array method whose result is thrown away: `splice`, `sort`", () => {
		const facts = factsFor(`
			import { type RootStore } from "./store";
			export const cut = (state: RootStore): void => { state.lines.sort(); state.lines.splice(0, 1); };
		`);

		expect(storeWrites(facts, "cut")).toHaveLength(2);
	});

	it("a method on an alias of an accessor call: `const ch = getRootStore()?.channel; ch.appendLine(…)`", () => {
		const facts = factsFor(`
			import { getRootStore } from "./store";
			export const info = (m: string): void => { const ch = getRootStore()?.channel; if (ch) ch.appendLine(m); };
		`);

		expect(storeWrites(facts, "info")).toHaveLength(1);
	});

	it("a method straight on the call chain: `getRootStore()?.lines?.push(…)`", () => {
		const facts = factsFor(`
			import { getRootStore } from "./store";
			export const warn = (m: string): void => { getRootStore()?.lines?.push(m); };
		`);

		expect(storeWrites(facts, "warn")).toHaveLength(1);
	});

	it("an assignment into the call result: `getRootStore().level = …`", () => {
		const facts = factsFor(`
			import { getRootStore } from "./store";
			export const set = (level: string): void => { getRootStore()!.level = level; };
		`);

		expect(storeWrites(facts, "set")).toHaveLength(1);
	});

	it("an assignment into an alias of an accessor call: `const s = getRootStore(); s.level = …`", () => {
		const facts = factsFor(`
			import { getRootStore } from "./store";
			export const configure = (level: string): void => { const s = getRootStore(); if (s) s.level = level; };
		`);

		expect(storeWrites(facts, "configure")).toHaveLength(1);
	});
});
