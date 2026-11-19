"use strict";

// The reason a caught error carries, as one string. A reader that swallows an
// error states the subject (what it was reading) and the reason; this is the ONE
// spelling of "the reason", so every notice reads the same way. An error with no
// message is still reported — by its string form, never as silence.

const reasonOf = (error: { message?: string }): string => error.message ?? String(error);

export { reasonOf };
