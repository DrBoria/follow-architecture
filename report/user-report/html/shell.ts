"use strict";

// The HTML shell. It inlines the compiled React bundle and the JSON payload
// into ONE file, so the overview can be written anywhere and opened straight
// from disk (no server, no network, no sidecar files).

import { getBundle } from "../build/bundle";
import type { OverviewData } from "../../../entities/overview-data";

const escapeForScript = (text: string): string => String(text).replace(/<\/script/gi, "<\\/script");

const renderHtml = (data: OverviewData): string => {
	const js = escapeForScript(getBundle());
	const payload = escapeForScript(JSON.stringify(data));

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Architecture overview — ${data.meta.repoName}</title>
</head>
<body>
<div id="root"></div>
<script type="application/json" id="arch-data">${payload}</script>
<script>${js}</script>
</body>
</html>
`;
};

export { renderHtml };
