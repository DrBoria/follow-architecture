"use strict";

// THE screen contract: every screen reads the same payload and the same route
// params. One type, so `App` can pick a screen without knowing which it is.

import type { OverviewData } from "../../../../entities/overview-data";

// The route params a screen may read (all strings — the hash is text).
type ScreenParams = Record<string, string>;

type ScreenProps = { data: OverviewData; params: ScreenParams };

export type { ScreenParams, ScreenProps };
