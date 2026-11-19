// Turn a nested architecture query (`infer` blocks, invariant conditions) into
// short readable lines. The algorithm is shared with the Node-side summarizer
// (`report/user-report/shared/describe.ts`); this side only picks the browser's
// presentation (no keys ignored, `is set` keeps the value it carries).
import { describeQuery as describeQueryImpl } from "../../shared/describe";
import type { FieldValue } from "../../../../utils/field";

export const describeQuery = (query: FieldValue): string[] => describeQueryImpl(query);
