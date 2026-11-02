import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

import { describe, it, expect, beforeAll, afterAll } from "vitest";
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { main } = require("../../main");

// The forwarder role must match a function whose BODY IS a single call that
// forwards all parameters — and must NOT match a function that merely
// contains such a call inside an if/for body (its `lines` span the whole block).
const ARCH = JSON.stringify({
	nodes: {
		// The role's home is `src/helpers`, so a forwarder in `src/` is a misfit
		// and its top-level report fires.
		src: { slug: "src", name: "src", children: ["**/*.ts", "helpers"] },
		helpers: { slug: "helpers",
		role: "forwarder", name: "helpers", parent: "src", children: ["**/*.ts"] },
	},
	codeRoles: [
		{
			slug: "forwarder",
			infer: [
				{ kind: { own: { is: { in: ["FunctionDeclaration", "FunctionExpression", "ArrowFunction", "MethodDeclaration", "GetAccessor", "SetAccessor"] } } } },
				// ONE line = one expression: the body is the call itself.
				{ lines: { length: { lte: 1 } } },
				// ONE call, to a plain function (not a member of something).
				{ calls: { length: { equals: 1 }, every: { bare: { equals: true } } } },
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
	// params, but the body is a block of several statements (many lines).
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
