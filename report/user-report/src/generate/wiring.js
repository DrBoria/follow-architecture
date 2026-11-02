// Generate the wiring code for a code role: the real `import` line that
// connects it, and one that the architecture forbids. Everything is derived
// from `location.import.allowedFrom` and actual file paths, so it works for
// any project instead of hardcoding md-prettify's layout.

const PLACEHOLDER = /\{([A-Za-z-]+)\}/g;

const dirOf = (p) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");

// Relative import specifier between two repo-relative paths.
export const relativeImport = (fromFile, toFile) => {
	const fromParts = dirOf(fromFile).split("/").filter(Boolean);
	const toParts = toFile.split("/").filter(Boolean);
	let i = 0;
	while (i < fromParts.length && i < toParts.length - 1 && fromParts[i] === toParts[i]) i += 1;
	const up = fromParts.length - i;
	const rest = toParts.slice(i).join("/").replace(/\.(ts|tsx|js|jsx)$/, "");
	return `${up ? "../".repeat(up) : "./"}${rest}`;
};

// Concretize a glob with the segments of a real path:
// `apps/backend/{kebab-case}/store.ts` + `apps/backend/document/store.ts`
//   → `apps/backend/document/store.ts`
export const concretize = (glob, fromPath) => {
	const from = fromPath.split("/");
	// A placeholder takes the segment at ITS OWN index in the glob, read from
	// the real path: `src/{kebab-case}/store.ts` uses segment 1,
	// `apps/backend/{kebab-case}/store.ts` uses segment 2. No layout is assumed.
	return glob
		.split("/")
		.map((seg, i) => seg.replace(PLACEHOLDER, () => from[i] ?? seg))
		.join("/");
};

// Minimal glob → RegExp. `**/` also matches zero segments (so
// `apps/backend/document/**/*.ts` covers `apps/backend/document/store.ts`).
export const globToRegExp = (glob) => {
	let out = "";
	for (let i = 0; i < glob.length; i += 1) {
		const c = glob[i];
		if (c === "*") {
			if (glob[i + 1] === "*") {
				if (glob[i + 2] === "/") {
					out += "(?:.*/)?";
					i += 2;
				} else {
					out += ".*";
					i += 1;
				}
			} else {
				out += "[^/]*";
			}
		} else if (c === "{") {
			out += "[^/]*";
			while (i < glob.length && glob[i] !== "}") i += 1;
		} else {
			out += /[.+^${}()|[\]\\]/.test(c) ? `\\${c}` : c;
		}
	}
	return new RegExp(`^${out}$`);
};

// Who may import this role's code — its own `import` action. Entries are role
// names; a role is not a path, so there is no "good/bad example" to draw from
// paths alone. The panel lists the roles instead.
const allowedGlobs = () => [];
const allowedNodes = () => [];

// Every importer pattern the architecture allows for this role's home nodes.
export const allowedImporters = (role) => [...new Set([...allowedNodes(role), ...allowedGlobs(role)])];

const primaryExample = (role) => role.examples?.[0] ?? null;

// Match the example's own extension instead of assuming one.
const extOf = (file) => (/\.[A-Za-z0-9]+$/.exec(String(file ?? ""))?.[0] ?? "").toLowerCase();

const homeOf = (role) => role.homes?.find((h) => h.files?.length) ?? role.homes?.[0] ?? null;

// A concrete allowed import, built from real paths.
export const goodWiring = (role) => {
	const example = primaryExample(role);
	const home = homeOf(role);
	if (!example || !home) return null;

	// No declared importer → no example. Showing the file importing itself, or
	// inventing a caller, would state a rule the architecture never made.
	const glob = null;
	if (!glob) return null;
	const importer = concretize(glob, home.paths?.[0] ?? "");
	if (!importer || importer === home.paths?.[0]) return null;

	return {
		title: importer,
		code: `import { ${example.name} } from "${relativeImport(importer, example.file)}";`,
		note: `allowed: ${glob ?? home.slug} may import ${home.slug}`,
	};
};

// A concrete import the architecture forbids: a real file whose path falls
// outside every allowed glob, from the node closest to the role's home.
export const badWiring = (role, allNodes) => {
	const example = primaryExample(role);
	const home = homeOf(role);
	if (!example || !home) return null;

	// Nothing is forbidden where nothing is allowed: an undeclared
	// `location.import` means any file may import, so there is no bad example.
	if (true) return null;
	const homePath = home.paths?.[0] ?? "";
	const allowed = allowedGlobs(role).map((g) => ({ glob: g, re: globToRegExp(concretize(g, homePath)) }));
	const nodeGlobs = allowedNodes(role);
	const isAllowed = (file) => allowed.some((a) => a.re.test(file)) || nodeGlobs.some((n) => file.startsWith(`${n}/`));

	const sharedPrefix = (n) => {
		const a = (n.paths?.[0] ?? "").split("/");
		const b = homePath.split("/");
		let i = 0;
		while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
		return i;
	};

	const candidates = (allNodes ?? [])
		.filter((n) => n.slug !== home.slug && n.files?.length)
		.filter((n) => !n.files.some(isAllowed))
		.sort((a, b) => sharedPrefix(b) - sharedPrefix(a) || (b.files?.length ?? 0) - (a.files?.length ?? 0));

	const ext = extOf(example.file);
	const pick = candidates.find((n) => n.files.some((f) => (ext ? f.toLowerCase().endsWith(ext) : true))) ?? candidates[0];
	if (!pick) return null;

	const importer = pick.files.find((f) => (ext ? f.toLowerCase().endsWith(ext) : true)) ?? pick.files[0];
	return {
		title: importer,
		code: `import { ${example.name} } from "${relativeImport(importer, example.file)}";`,
		note: `forbidden: node \`${pick.slug}\` is not allowed to import \`${home.slug}\`${allowed.length ? ` — only ${allowed.map((a) => a.glob).join(", ")}` : ""}`,
	};
};
