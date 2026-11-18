// Scan config for utils-uniqueness over this CJS codebase: the type checker
// must not CHECK the JS (checkJs:false) — it only reads it. Without this the
// checker crashes on plain CommonJS files ("reading 'flags'").
module.exports = {
	tsconfig: "tsconfig.scan.json",
};