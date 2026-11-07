"use strict";

// Reading a field path off a fact. `{ "path.dir": … }` and `{ path: { dir: … } }`
// are the same filter, and `$path.dir` refers to the same place — so the walk
// below is the single definition of "which value does this key name".
//
// A segment that lands ON a list yields what that segment names in every element
// (`kind.descendants.tags.arg` → every tag argument under the node). Without
// that, `$` could name a fact inside an object but never collect one across a
// list — and "does every parameter have a tag with the same name" is exactly a
// comparison of two such lists.
const fieldOf = (item, key) => {
	if (item == null) return undefined;
	if (!String(key).includes(".")) return item[key];

	return String(key)
		.split(".")
		.reduce((acc, k) => {
			if (acc == null) return undefined;
			// A segment the array ITSELF answers — `length`, an index — is read, not
			// spread: `$parameters.length` is a number, `$parameters.name` is a list.
			if (Array.isArray(acc)) return k in acc ? acc[k] : acc.flatMap((entry) => (entry == null ? [] : (fieldOf(entry, k) ?? [])));

			return acc[k];
		}, item);
};

module.exports = { fieldOf };
