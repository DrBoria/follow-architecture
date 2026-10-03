#!/usr/bin/env node
"use strict";

const { main } = require("../main");

process.exitCode = main(process.argv.slice(2));
