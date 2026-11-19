"use strict";

// The ONE reader of the config-error marker. `report/configErrors` builds the
// errors (each carries `isConfigError: true`); the CLI and the ESLint rule both
// ask "is this caught value a config sentence or a crash?" the same way, so the
// guard lives here once — beside the renderers that answer each case.

// A config failure is an Error with the marker set; anything else is a crash.
type ConfigErrorLike = Error & { isConfigError?: boolean };

const isConfigError = (error: ConfigErrorLike | null | undefined): error is ConfigErrorLike & { isConfigError: true } =>
	error != null && error.isConfigError === true;

export { isConfigError };
export type { ConfigErrorLike };
