"use strict";

// Reading a field path off a fact. `{ "path.dir": … }` and `{ path: { dir: … } }`
// are the same filter, and `$path.dir` refers to the same place — so the walk
// below is the single definition of "which value does this key name".
const fieldOf = (item, key) => {
	if (item == null) return undefined;
	if (!String(key).includes(".")) return item[key];

	return String(key)
		.split(".")
		.reduce((acc, k) => (acc == null ? undefined : acc[k]), item);
};

module.exports = { fieldOf };
