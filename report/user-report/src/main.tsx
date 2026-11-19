import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "styled-components";
import App from "./App";
import { GlobalStyle, theme } from "./theme";

// The payload is the JSON the Node side inlined. `App` states the shape it
// reads (`OverviewData`), so the parse is checked at that boundary — the one
// place the untyped JSON enters the typed app.
const node = document.getElementById("arch-data");
const data = JSON.parse(node?.textContent ?? "{}");

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(
		<ThemeProvider theme={theme}>
			<GlobalStyle />
			<App data={data} />
		</ThemeProvider>,
	);
}
