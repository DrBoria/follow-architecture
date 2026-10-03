"use strict";

const globToRegex = (glob) => {
	let out = "";
	for (let i = 0; i < glob.length; i += 1) {
		const c = glob[i];
		if (c === "*") {
			if (glob[i + 1] === "*") {
				out += ".*";
				i += 1;
			} else {
				out += "[^/]*";
			}
		} else if (c === "?") {
			out += "[^/]";
		} else if (c === "\\" || c === "." || c === "+" || c === "^" || c === "$" || c === "|" || c === ")" || c === "[") {
			out += `\\${c}`;
		} else {
			out += c;
		}
	}
	return out;
};

const globToRegexStrict = (glob) => {
	let out = "";
	for (let i = 0; i < glob.length; i += 1) {
		const c = glob[i];
		if (c === "*") {
			if (glob[i + 1] === "*") {
				if (glob[i + 2] === "/") {
					out += "(?:[^/]+/)*";
					i += 2;
				} else {
					out += ".*";
					i += 1;
				}
			} else {
				out += "[^/]*";
			}
		} else if (c === "?") {
			out += "[^/]";
		} else if (c === "\\" || c === "." || c === "+" || c === "^" || c === "$" || c === "|" || c === ")" || c === "[") {
			out += `\\${c}`;
		} else {
			out += c;
		}
	}
	return out;
};

module.exports = { globToRegex, globToRegexStrict };

