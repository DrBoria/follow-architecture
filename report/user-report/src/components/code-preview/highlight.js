// Syntax highlighting for the code previews. Only TypeScript / JavaScript /
// JSON are registered: the report shows architecture code, not arbitrary
// languages, and registering fewer grammars keeps the inlined bundle small.

import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);

export const highlight = (code, lang = "typescript") => {
	const language = hljs.getLanguage(lang) ? lang : "typescript";
	return hljs.highlight(code, { language, ignoreIllegals: true }).value;
};
