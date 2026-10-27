import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");

// The forwarder role must match a function whose BODY IS a single call that
// forwards all parameters — and must NOT match a function that merely
// contains such a call inside an if/for body (bodyStatements > 1).
const ARCH = JSON.stringify({
	nodes: {
		// `kind: []` excludes the forwarder role, so a classified candidate
		// in this node is a misfit and its top-level report fires.
		src: { slug: "src", name: "src", kind: [], children: ["**/*.ts"] },
	},
	codeRoles: [
		{
			slug: "forwarder",
			infer: [
				{ kind: { in: ["FunctionDeclaration", "FunctionExpression", "ArrowFunction", "MethodDeclaration", "GetAccessor", "SetAccessor"] } },
				{ bodyStatements: { or: [{ equals: 0 }, { equals: 1 }] } },
				{ calls: { length: { equals: 1 }, every: { forwardsAllParams: { equals: true } } } },
			],
			report: { message: "thin forwarder: {what}" },
		},
	],
	invariants: [],
});

let root;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "fa-forwarder-"));
	fs.writeFileSync(path.join(root, "architecture.json"), ARCH);
	fs.mkdirSync(path.join(root, "src"), { recursive: true });
	// A true forwarder: body is exactly the forwarded call.
	fs.writeFileSync(path.join(root, "src", "forward.ts"), "const target = (x, y) => x + y;\nexport const forward = (x, y) => target(x, y);\n");
	// A false positive to avoid: a single descendant call that forwards all
	// params, but the body also has an if and a for loop (bodyStatements > 1).
	fs.writeFileSync(
		path.join(root, "src", "logic.ts"),
		"export const isPrime = (num: number): boolean => {\n  if (num < 2) return false;\n  for (let i = 2; i * i <= num; i++) {\n    if (num % i === 0) return false;\n  }\n  return true;\n};\n",
	);
	// The real FP shape (learnMath.ts isPrime): a single descendant call that
	// forwards all params — but it sits inside a loop, so the body is several
	// statements, not one.
	fs.writeFileSync(
		path.join(root, "src", "loop.ts"),
		"export const scan = (n: number): boolean => {\n  for (let i = 2; i * i <= n; i++) {\n    if (i === Math.sqrt(n)) return false;\n  }\n  return true;\n};\n",
	);
});

afterAll(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

const run = (argv) => {
	let printed = "";
	const orig = console.log;
	console.log = (s) => {
		printed += `${s}\n`;
	};
	let code = 0;
	const prevCwd = process.cwd();
	process.chdir(root);
	try {
		code = main(argv);
	} finally {
		process.chdir(prevCwd);
		console.log = orig;
	}
	return { code, printed };
};

describe("forwarder role inference", () => {
	it("flags a function whose body is a single forwarded call", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--check", "--files", "src/forward.ts"]);
		expect(code).toBe(1);
		expect(printed).toContain("thin forwarder: forward");
	});

	it("does not flag a function with control flow in its body", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--files", "src/logic.ts"]);
		expect(code).toBe(0);
		expect(printed).not.toContain("thin forwarder");
	});

	it("does not flag a loop body that happens to forward all params", () => {
		const { printed, code } = run(["--config", path.join(root, "architecture.json"), "--files", "src/loop.ts"]);
		expect(code).toBe(0);
		expect(printed).not.toContain("thin forwarder");
	});
});
