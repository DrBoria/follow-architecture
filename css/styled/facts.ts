"use strict";

// The SHAPES the CSS facet produces, derived from the ONE producer of each.
// A fact shape with a single producer is `ReturnType<typeof thatFn>` — never a
// hand-written copy that could drift. Multi-producer contracts (the document
// fact set, assembled by every syntax provider) stay explicit interfaces in
// their producer (`document.ts`).
//
// Nothing here knows a syntax: `css`, `scss`, a styled template after
// substitution and anything registered next all produce these same shapes.

import type { templateSource, leadingCommentOf } from "./template";

// The substituted template text plus the map back to the expressions it quotes.
type TemplateSource = ReturnType<typeof templateSource>;
type TemplateExpr = TemplateSource["exprs"][number];

// The comment a declaration is documented by.
type LeadingComment = ReturnType<typeof leadingCommentOf>;
// The non-null comment shape, shared by every "comment above a node" reader.
type CommentFact = NonNullable<LeadingComment>;

export type { TemplateSource, TemplateExpr, LeadingComment, CommentFact };
