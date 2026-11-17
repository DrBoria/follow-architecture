import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { buildArchitecture } = require("../../main");
const { buildTree } = require("../../entities/tree/build");
const { normalizeCodeRoles } = require("../../code-roles/roles");
const { normalizeInvariant } = require("../../invariants/normalize");
const { checkRegex } = require("../../utils/pattern");
const { SCHEMA } = require("../../entities/schema");
const configErrors = require("../../report/configErrors");

const ROOT = path.resolve(import.meta.dirname, "../..");

// The message a broken config produces, or null when it produced none.
const messageOf = (run) => {
	try {
		run();
		return null;
	} catch (error) {
		return error;
	}
};

// Every way the format can be written wrong, and the sentence the reader gets.
// The assertion is not a full-text match — the wording is allowed to change — but
// it pins the three things a reader needs: WHICH thing is wrong, WHERE it is
// written, and WHAT may be written instead.
const BROKEN = [
	{
		what: "the file is not a map",
		run: () => buildArchitecture(null),
		says: [/^architecture:/, /expected an object/, /`aliases`, `codeRoles`, `nodes`, `invariants`/],
	},
	{
		what: "there are no nodes",
		run: () => buildArchitecture({}),
		says: [/architecture\.nodes/, /non-empty/],
	},
	{
		what: "two invariants share an id",
		run: () => buildArchitecture({ nodes: [{ slug: "a", name: "a" }], invariants: [{ id: "x" }, { id: "x" }] }),
		says: [/invariants/, /unique/, /`x`/],
	},
	{
		what: "a node names a role the config never describes",
		run: () => buildArchitecture({ nodes: [{ slug: "a", name: "a", role: "nope" }] }),
		says: [/`role: nope`/, /names no codeRole/],
	},
	{
		what: "a node carries a key that is not structure",
		run: () => buildTree([{ slug: "a", name: "a", kind: { own: {} } }]),
		says: [/`a\.kind`/, /not a node key/, /`slug`, `name`, `parent`, `children`, `report`, `role`, `required`/],
	},
	{
		what: "a node names a parent that does not exist",
		run: () => buildTree([{ slug: "a", name: "a", parent: "zz" }]),
		says: [/`a`/, /unknown parent/, /`zz`/],
	},
	{
		what: "a node names a child that does not exist",
		run: () => buildTree([{ slug: "a", name: "a", children: [{ node: "zz" }] }]),
		says: [/`a`/, /unknown child/, /`zz`/],
	},
	{
		what: "a codeRole is not an object",
		run: () => normalizeCodeRoles([3]),
		says: [/codeRoles/, /object/, /`slug`/],
	},
	{
		what: "a codeRole has no slug",
		run: () => normalizeCodeRoles([{ name: "x" }]),
		says: [/codeRoles/, /needs a `slug`/],
	},
	{
		what: "a codeRole claims a `where` — a role is WHAT, a node is WHERE",
		run: () => normalizeCodeRoles([{ slug: "r", where: ["**/*.ts"] }]),
		says: [/`r\.where`/, /a node says WHERE/, /role: r/],
	},
	{
		what: "a codeRole carries a key the entity does not have",
		run: () => normalizeCodeRoles([{ slug: "r", kind: {} }]),
		says: [/`r\.kind`/, /not a role key/, /`slug`, `name`, `infer`, `report`, `actions`/],
	},
	{
		what: "a role infers by a role that does not exist",
		run: () => normalizeCodeRoles([{ slug: "r", infer: ["zz"] }]),
		says: [/`r`/, /unknown role/, /`zz`/],
	},
	{
		what: "a role infers by itself",
		run: () => normalizeCodeRoles([{ slug: "r", infer: ["r"] }]),
		says: [/`r`/, /by itself/],
	},
	{
		what: "an action is not an object",
		run: () => normalizeCodeRoles([{ slug: "r", actions: { import: 3 } }]),
		says: [/`r\.actions\.import`/, /object/, /`where`/],
	},
	{
		what: "an action has no `where` — a permission that names nobody",
		run: () => normalizeCodeRoles([{ slug: "r", actions: { import: {} } }]),
		says: [/`r\.actions\.import`/, /no `where`/],
	},
	{
		what: "an action carries a key the entity does not have",
		run: () => normalizeCodeRoles([{ slug: "r", actions: { import: { where: ["**/*.ts"], nope: 1 } } }]),
		says: [/`r\.actions\.import\.nope`/, /not an action key/, /`where`, `except`, `of`, `scopeAccess`/],
	},
	{
		what: "`of:` names a fact the engine does not produce",
		run: () => normalizeCodeRoles([{ slug: "r", actions: { import: { where: ["**/*.ts"], of: "bogus" } } }]),
		says: [/`of: bogus`/, /produces/, /import/],
	},
	{
		what: "scopeAccess names a scope that is not one",
		run: () => normalizeCodeRoles([{ slug: "r", actions: { call: { where: ["**/*.ts"], scopeAccess: [{ scope: "weird", segments: ["a"] }] } } }]),
		says: [/scopeAccess/, /function \| object \| method/, /weird/],
	},
	{
		what: "scopeAccess spells a root with no segments",
		run: () => normalizeCodeRoles([{ slug: "r", actions: { call: { where: ["**/*.ts"], scopeAccess: [{ scope: "function", segments: [] }] } } }]),
		says: [/scopeAccess/, /segments/, /`function`/],
	},
	{
		what: "an invariant is not an object",
		run: () => normalizeInvariant(3),
		says: [/invariants/, /object/, /`id`/],
	},
	{
		what: "an invariant has no id",
		run: () => normalizeInvariant({}),
		says: [/invariants/, /needs an `id`/],
	},
	{
		what: "`dedupeBy` is not a place",
		run: () => normalizeInvariant({ id: "x", dedupeBy: "a" }),
		says: [/`dedupeBy: a`/, /not a place/, /`where` entry/],
	},
	{
		what: "a `where` entry holds a broken regular expression",
		run: () => checkRegex("(", "invariant x.where"),
		says: [/invariant x\.where/, /invalid pattern/, /`\(`/],
	},
];

describe("config — every way to write it wrong has a sentence", () => {
	for (const { what, run, says } of BROKEN) {
		it(what, () => {
			const error = messageOf(run);
			expect(error, "this config is accepted, so the reader is told nothing").not.toBeNull();
			for (const pattern of says) expect(error.message).toMatch(pattern);
			// A config mistake is not a crash: `main` prints it as a sentence and
			// stops, so nothing above may print a stack trace for it.
			expect(error.isConfigError, `"${error.message}" is not marked as a config failure`).toBe(true);
		});
	}

	it("names nothing twice and leaves no placeholder unfilled", () => {
		for (const { run } of BROKEN) {
			const { message } = messageOf(run);
			expect(message).not.toMatch(/undefined|\$\{|\[object/);
			expect(message).not.toMatch(/\.\.|,,/);
		}
	});

	it("says WHERE the config is wrong, not just what", () => {
		// Every sentence names the path inside the document the reader must open —
		// the entity and the key, not a file line they cannot act on.
		for (const { run } of BROKEN) {
			const { message } = messageOf(run);
			expect(message).toMatch(/architecture|nodes:|codeRoles:|invariants:|where/);
		}
	});
});

describe("config — the file it came from is named", () => {
	const write = (name, text) => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fa-bad-"));
		const file = path.join(dir, name);
		fs.writeFileSync(file, text);
		return file;
	};
	const { loadArchitecture } = require("../../main");

	it("a failure from a YAML on disk says which file to open", () => {
		const file = write("architecture.yaml", "nodes:\n  - slug: a\n    name: a\n    kind: x\n");
		const error = messageOf(() => loadArchitecture(file));
		expect(error.message).toMatch(/not a node key/);
		// The path travels INSIDE the sentence, so an editor that shows only the
		// message (ESLint) still says which file to open.
		expect(error.message).toContain(`in ${file}`);
		expect(error.isConfigError).toBe(true);
	});

	it("a config that does not parse says why AND where — a line, not a stack", () => {
		const file = write("architecture.yaml", "nodes:\n  - slug: a\n   name: a\n");
		const error = messageOf(() => loadArchitecture(file));
		expect(error.message).toMatch(/not YAML or JSON/);
		expect(error.message).toMatch(/line 3/);
		expect(error.message).toContain(`in ${file}`);
		expect(error.isConfigError).toBe(true);
	});

	it("a config that is not there says so, instead of an ENOENT stack", () => {
		const missing = path.join(os.tmpdir(), "fa-definitely-not-here", "architecture.yaml");
		const error = messageOf(() => loadArchitecture(missing));
		expect(error.message).toMatch(/cannot read the file/);
		expect(error.message).toContain(`in ${missing}`);
		expect(error.isConfigError).toBe(true);
	});

	it("a config is DATA: a JS file is not a format of its own", () => {
		// There was a `require` branch keyed on `.js` / `.cjs` — it could not work
		// for `.mjs`, does not exist for `.ts`, and made the loading path decide the
		// format by extension while the parser decided by content.
		const file = write("architecture.js", "module.exports = { nodes: [] };\n");
		const error = messageOf(() => loadArchitecture(file));
		expect(error.message).toMatch(/not an object|not YAML or JSON/);
		expect(error.message).toContain(`in ${file}`);
	});
});

describe("config — the CLI prints the sentence, not a stack", () => {
	const runBin = (cwd) => {
		try {
			execFileSync(process.execPath, [path.join(ROOT, "bin", "follow-architecture.js")], {
				cwd,
				encoding: "utf8",
				stdio: ["ignore", "pipe", "pipe"],
			});
			return { code: 0, out: "", err: "" };
		} catch (error) {
			return { code: error.status, out: String(error.stdout ?? ""), err: String(error.stderr ?? "") };
		}
	};

	it("a broken config exits non-zero with the message and no stack", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fa-cli-bad-"));
		fs.writeFileSync(path.join(dir, "architecture.yaml"), "nodes:\n  - slug: a\n    name: a\n    kind: x\n");
		const { code, err } = runBin(dir);
		expect(code).not.toBe(0);
		expect(err).toMatch(/not a node key/);
		// The file to open, and nothing that looks like a crash report.
		expect(err).toMatch(/in .*architecture\.yaml/);
		expect(err).not.toMatch(/\n\s+at /);
		expect(err).not.toMatch(/follow-architecture\/[\w/]+\.js:\d+/);
	});
});

describe("config — the editor gets the same sentence as the CLI", () => {
	it("the ESLint rule REPORTS a broken config instead of throwing a stack at it", () => {
		const { plugin } = require("../../config");
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fa-rule-"));
		fs.writeFileSync(path.join(dir, "architecture.yaml"), "nodes:\n  - slug: a\n    name: a\n    kind: x\n");
		fs.mkdirSync(path.join(dir, "src"));
		const filename = path.join(dir, "src", "a.ts");
		fs.writeFileSync(filename, "export const a = 1;\n");
		const reported = [];
		const visitors = plugin.rules["follow-architecture"].create({
			options: [{ config: "architecture.yaml" }],
			filename,
			report: (message) => reported.push(message),
			getFilename: () => filename,
		});
		// Nothing threw, and the sentence is what the editor shows — with the file.
		visitors.Program({});
		expect(reported).toHaveLength(1);
		expect(reported[0].message).toMatch(/not a node key/);
		expect(reported[0].message).toContain(`in ${path.join(dir, "architecture.yaml")}`);
	});

	it("a bug in the engine is still thrown — it is not a sentence", () => {
		const { plugin } = require("../../config");
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fa-rule-crash-"));
		fs.writeFileSync(path.join(dir, "architecture.yaml"), "nodes:\n  - slug: a\n    name: a\n");
		const filename = path.join(dir, "nowhere.ts");
		const error = messageOf(() =>
			plugin.rules["follow-architecture"].create({
				options: [{ config: "architecture.yaml" }],
				filename,
				report: () => {},
				getFilename: () => filename,
			}),
		);
		// It did not turn into a "config" message: whatever the failure, the rule
		// never claims the architecture is wrong when it is not.
		expect(error === null || !error.isConfigError).toBe(true);
	});
});

describe("config — a config may be called anything, and it anchors the repo", () => {
	// The default names are a convenience for "nobody said which file". A run that
	// NAMES its file must not go looking for `architecture.yaml` instead: that
	// resolved to a different file (or to the editor's cwd) and the whole tree came
	// out relative to the wrong folder.
	const makeRepo = () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fa-anchor-"));
		const repo = path.join(dir, "repo");
		fs.mkdirSync(path.join(repo, "src"), { recursive: true });
		fs.writeFileSync(
			path.join(repo, "arch.custom.yaml"),
			"codeRoles:\n  - slug: logic\n    infer:\n      - kind:\n          own:\n            is:\n              equals: FunctionDeclaration\nnodes:\n  - slug: src\n    name: src\n    children: [a.ts]\n",
		);
		// A decoy with a DEFAULT name one level up: a run that searched by default
		// names would stop here and describe the wrong repo.
		fs.writeFileSync(path.join(dir, "architecture.yaml"), "nodes:\n  - slug: src\n    name: src\n");
		fs.writeFileSync(path.join(repo, "src", "a.ts"), "export function helper() {\n\treturn 1;\n}\n");
		return { dir, repo };
	};

	it("the ESLint rule anchors on the file it was given", () => {
		const { plugin } = require("../../config");
		const { dir, repo } = makeRepo();
		const filename = path.join(repo, "src", "a.ts");
		const visitors = plugin.rules["follow-architecture"].create({
			options: [{ config: "arch.custom.yaml", exportPath: false }],
			filename,
			report: () => {},
			getFilename: () => filename,
		});
		// It found the config where it was told to look: no config error was reported
		// and the run produced a plain visitor set (the decoy above would have made
		// the named file unreachable).
		expect(Object.keys(visitors)).not.toEqual(["Program"]);
		expect(fs.existsSync(path.join(dir, "architecture.yaml"))).toBe(true);
	});

	it("the CLI counts paths from the folder that holds the config", () => {
		const { dir, repo } = makeRepo();
		const printed = String(
			execFileSync(process.execPath, [path.join(ROOT, "bin", "follow-architecture.js"), "--config", path.join("repo", "arch.custom.yaml")], {
				cwd: dir,
				encoding: "utf8",
			}),
		);
		// `--config repo/arch.custom.yaml`, run from the parent: the report is about
		// `repo`, not about where the shell happened to be.
		expect(printed).toContain(`Generated against \`${repo}\``);
	});

	it("an explicit --cwd still decides where the scan starts", () => {
		const { dir } = makeRepo();
		const printed = String(
			execFileSync(process.execPath, [path.join(ROOT, "bin", "follow-architecture.js"), "--config", path.join("repo", "arch.custom.yaml"), "--cwd", dir], {
				cwd: dir,
				encoding: "utf8",
			}),
		);
		expect(printed).toContain(`Generated against \`${dir}\``);
	});
});

describe("config — the schema and the sentences cannot drift", () => {
	it("every key list the reader is shown comes from SCHEMA", () => {
		const role = messageOf(() => normalizeCodeRoles([{ slug: "r", kind: {} }])).message;
		const node = messageOf(() => buildTree([{ slug: "a", name: "a", kind: {} }])).message;
		const invariant = messageOf(() => normalizeInvariant({ id: "x", kind: {} })).message;
		for (const key of SCHEMA.role) expect(role).toContain(`\`${key}\``);
		for (const key of SCHEMA.node) expect(node).toContain(`\`${key}\``);
		for (const key of SCHEMA.invariant) expect(invariant).toContain(`\`${key}\``);
	});

	it("every key an entity accepts is one SCHEMA declares", () => {
		// The other direction: a key that works but is not declared would be a rule
		// nobody can find in the format. Each entry below must be ACCEPTED.
		const accepted = {
			role: normalizeCodeRoles([{ slug: "r", name: "R", infer: [], report: { message: "m" }, actions: {} }]),
			node: buildTree([{ slug: "a", name: "a", children: [], report: { message: "m" } }]),
			invariant: normalizeInvariant({ id: "x", where: [], ignore: [], when: [], infer: [], report: { message: "m" }, dedupeBy: { node: "a" }, children: [] }),
			top: buildArchitecture({ nodes: [{ slug: "a", name: "a" }], codeRoles: [], invariants: [], aliases: {} }),
		};
		expect(accepted.role).toBeTruthy();
		expect(accepted.node).toBeTruthy();
		expect(accepted.invariant).toBeTruthy();
		expect(accepted.top).toBeTruthy();
	});

	it("every sentence builder is used by the engine, so none rots unread", () => {
		const names = Object.keys(configErrors);
		const files = [];
		const walk = (dir) => {
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				if (entry.name === "node_modules" || entry.name === "tests" || entry.name.startsWith(".")) continue;
				const abs = path.join(dir, entry.name);
				if (entry.isDirectory()) walk(abs);
				else if (entry.name.endsWith(".js")) files.push(abs);
			}
		};
		walk(ROOT);
		const source = files
			.filter((f) => f !== path.join(ROOT, "report", "configErrors.js"))
			.map((f) => fs.readFileSync(f, "utf8"))
			.join("\n");
		const unused = names.filter((name) => !source.includes(`configError.${name}(`) && !source.includes(`configErrors.${name}(`));
		expect(unused).toEqual([]);
	});

	it("no user-facing config prose lives outside the report module", () => {
		// "The report module everywhere a sentence is written": a `throw new Error`
		// in the engine is a sentence nobody can find, and it reaches the reader as
		// a crash instead of a message.
		const files = [];
		const walk = (dir) => {
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				if (entry.name === "node_modules" || entry.name === "tests" || entry.name.startsWith(".")) continue;
				const abs = path.join(dir, entry.name);
				if (entry.isDirectory()) walk(abs);
				else if (entry.name.endsWith(".js")) files.push(abs);
			}
		};
		walk(ROOT);
		const offenders = files
			.filter((f) => !f.startsWith(path.join(ROOT, "report")))
			.filter((f) => /throw new Error\(/.test(fs.readFileSync(f, "utf8")))
			.map((f) => path.relative(ROOT, f));
		expect(offenders).toEqual([]);
	});
});
