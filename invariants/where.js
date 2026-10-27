"use strict";

// The `where` gate: a glob pattern (or list of patterns) the file path must
// match. Compiled at normalize time, tested at check time. Patterns support
// the same naming-convention placeholders as node children ({kebab-case},
// {camelCase}, …) via compilePattern — plain minimatch would treat
// {kebab-case} as a brace-expansion literal.

const { compilePattern } = require("../utils/pattern");

// An empty `where` list (the normalize default) means "no gate" — every file
// passes. `!inv.where` alone is not enough: `![]` is false, so an empty list
// would silently skip the invariant.
const matchWhere = (inv, ctx) => !inv.where || inv.where.length === 0 || inv.where.some((g) => g.re.test(ctx.rel));

module.exports = { matchWhere };
