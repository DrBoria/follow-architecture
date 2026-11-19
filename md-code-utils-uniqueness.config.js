// Scan config for utils-uniqueness over this TypeScript codebase. The sources
// are ordinary `.ts` files now, so the scanner reads THIS package's own
// `tsconfig.json` — no separate JS-only scan config is needed.
module.exports = {
	tsconfig: "tsconfig.json",
};
