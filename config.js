"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pipe, map, filter, flatMap, first, entries } = require("remeda");
const { globToRegexStrict } = require("./glob");

const compilePattern = (pattern) => {
	const names = [];
	const glob = pattern.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, n) => {
		names.push(n);
		return `\u0000${n}\u0000`;
	});
	const body = globToRegexStrict(glob).replace(/\u0000([A-Za-z][A-Za-z0-9_]*)\u0000/g, "([^/]+)");
	return { re: new RegExp(`^${body}$`), names };
};

const str = (v) => (v == null ? null : String(v));

const normalizeNode = (n) => ({
	id: String(n.id),
	pattern: String(n.pattern).replace(/\\/g, "/").replace(/\/+$/, ""),
	compiled: null,
	consume: pipe(
		Array.isArray(n.consume) ? n.consume : [],
		map((c) =>
			typeof c === "string"
				? { id: c, same: null, fix: null, message: null }
				: { id: String(c.id), same: str(c.same), fix: str(c.fix), message: str(c.message) },
		),
	),
	nameMust: pipe(Array.isArray(n.nameMust) ? n.nameMust : [], map(String)),
	nameMessage: str(n.nameMessage),
	nameFix: str(n.nameFix),
	nameForbid: pipe(
		Array.isArray(n.nameForbid) ? n.nameForbid : [],
		map((f) =>
			typeof f === "string"
				? { glob: f, message: null, fix: null }
				: { glob: String(f.glob), message: str(f.message), fix: str(f.fix) },
		),
	),
	namePattern: n.namePattern
		? {
				regexp: String(n.namePattern.regexp),
				re: new RegExp(String(n.namePattern.regexp)),
				except: pipe(Array.isArray(n.namePattern.except) ? n.namePattern.except : [], map(String)),
				message: str(n.namePattern.message),
				fix: str(n.namePattern.fix),
			}
		: null,
	captureMust: pipe(
		Array.isArray(n.captureMust) ? n.captureMust : [],
		map((c) => ({ capture: String(c.capture), values: pipe(c.values, map(String)), message: str(c.message), fix: str(c.fix) })),
	),
	captureEquals: pipe(
		Array.isArray(n.captureEquals) ? n.captureEquals : [],
		map((c) => ({ capture: String(c.capture), target: String(c.target), suffix: str(c.suffix), message: str(c.message), fix: str(c.fix) })),
	),
	exclude: pipe(Array.isArray(n.exclude) ? n.exclude : [], map(String)),
});

const checkPattern = (p, where) => {
	try {
		new RegExp(p);
	} catch (err) {
		throw new Error(`${where}: invalid regex \`${p}\` — ${err.message}`);
	}
};

const normalizeInvariant = (i) => {
	const when = String(i.when).replace(/\\/g, "/");
	const absent = i.absent ? String(i.absent).replace(/\\/g, "/") : null;
	return {
		id: String(i.id),
		when,
		whenCompiled: compilePattern(when),
		absent,
		absentCompiled: absent ? compilePattern(absent) : null,
		message: str(i.message),
		reason: str(i.reason),
		fix: str(i.fix),
		must: pipe(
			Array.isArray(i.must) ? i.must : [],
			map((m) => {
				checkPattern(String(m.pattern), `invariant \`${i.id}\` must`);
				return {
					pattern: String(m.pattern),
					reason: m.reason ? String(m.reason) : "required by the architecture",
					fix: str(m.fix),
					message: str(m.message),
				};
			}),
		),
		forbid: pipe(
			Array.isArray(i.forbid) ? i.forbid : [],
			map((f) => {
				checkPattern(String(f.pattern), `invariant \`${i.id}\` forbid`);
				return {
					pattern: String(f.pattern),
					reason: f.reason ? String(f.reason) : "forbidden by the architecture",
					fix: str(f.fix),
					message: str(f.message),
					except: pipe(Array.isArray(f.except) ? f.except : [], map(String)),
				};
			}),
		),
	};
};

const assertUnique = (items, kind) => {
	const ids = new Set(pipe(items, map((x) => x.id)));
	if (ids.size !== items.length) throw new Error(`${kind} ids must be unique`);
};

const normalizeArchitecture = (raw) => {
	if (!raw || typeof raw !== "object") throw new Error("options must be an architecture object or { file: \"architecture.json\" }");
	const arch = typeof raw.file === "string" ? JSON.parse(fs.readFileSync(path.resolve(process.cwd(), raw.file), "utf8")) : raw;
	if (!Array.isArray(arch.nodes) || arch.nodes.length === 0) throw new Error("architecture.nodes must be a non-empty array");
	const nodes = pipe(
		arch.nodes,
		map(normalizeNode),
		map((n) => ({ ...n, compiled: compilePattern(n.pattern) })),
	);
	assertUnique(nodes, "node");
	pipe(
		nodes,
		flatMap((n) => [
			...pipe(n.consume, map((c) => ({ node: n, kind: "consume", id: c.id, target: null }))),
			...pipe(n.captureMust, map((cm) => ({ node: n, kind: "captureMust", id: cm.capture, target: null }))),
			...pipe(n.captureEquals, map((ce) => ({ node: n, kind: "captureEquals", id: ce.capture, target: ce.target }))),
		]),
		map((ref) => {
			if (ref.kind === "consume" && !pipe(nodes, filter((x) => x.id === ref.id), first)) {
				throw new Error(`node \`${ref.node.id}\` consumes unknown node \`${ref.id}\``);
			}
			if (ref.kind !== "consume" && !ref.node.compiled.names.includes(ref.id)) {
				throw new Error(`node \`${ref.node.id}\` ${ref.kind} references unknown capture \`${ref.id}\``);
			}
			if (ref.kind === "captureEquals" && ref.target !== "basename" && ref.target !== "dir" && ref.target !== "folder" && !ref.node.compiled.names.includes(ref.target)) {
				throw new Error(`node \`${ref.node.id}\` captureEquals target \`${ref.target}\` must be "basename", "dir", "folder", or a capture of the same node`);
			}
			return ref;
		}),
	);
	const invariants = pipe(Array.isArray(arch.invariants) ? arch.invariants : [], map(normalizeInvariant));
	assertUnique(invariants, "invariant");
	const aliases =
		arch.aliases && typeof arch.aliases === "object"
			? Object.fromEntries(pipe(entries(arch.aliases), map(([k, v]) => [String(k), String(v).replace(/\\/g, "/").replace(/\/+$/, "")])))
			: {};
	return { nodes, invariants, aliases };
};

module.exports = { normalizeArchitecture };