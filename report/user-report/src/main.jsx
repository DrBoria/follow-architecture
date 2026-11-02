import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "styled-components";
import App from "./App";
import { GlobalStyle, theme } from "./theme";

const node = document.getElementById("arch-data");
const data = JSON.parse(node.textContent);

createRoot(document.getElementById("root")).render(
	<ThemeProvider theme={theme}>
		<GlobalStyle />
		<App data={data} />
	</ThemeProvider>,
);
