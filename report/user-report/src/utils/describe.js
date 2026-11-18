// Turn a nested architecture query (`infer` blocks, invariant conditions) into
// short readable lines. The algorithm is shared with the Node-side summarizer
// (`report/user-report/shared/describe.js`); this side only picks the browser's
// presentation (no keys ignored, `is set` keeps the value it carries).
import { describeQuery as describeQueryImpl } from "../../shared/describe";

export const describeQuery = (query) => describeQueryImpl(query);
