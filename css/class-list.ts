"use strict";

// A class list is a list of TOKENS: one entry per whitespace-separated class, as
// written. `md:hover:grid-cols-3` is ONE class with variants — splitting it would
// turn a class into three things that are not classes. What a token MEANS
// (variants, utility, value) is the class-syntax provider's question (`tailwind.ts`),
// not the list's. This reading is syntax-agnostic: any framework's class attribute
// is a string of tokens, read the same way.

const classList = (text: string | null | undefined): string[] => [...new Set(String(text ?? "").trim().split(/\s+/).filter(Boolean))];

export { classList };
