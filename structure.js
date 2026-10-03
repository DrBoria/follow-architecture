"use strict";

const fs = require("node:fs");
const path = require("node:path");

const loadArchitecture = (config) => {
  if (typeof config === "string") {
    return JSON.parse(fs.readFileSync(path.resolve(config), "utf8"));
  }
  if (config && typeof config === "object") {
    if (config.file) {
      return JSON.parse(fs.readFileSync(path.resolve(config.file), "utf8"));
    }
    return config;
  }
  throw new Error(
    "follow-architecture/structure: pass an architecture object or a path to architecture.json"
  );
};

const buildFolderStructureConfig = (architecture) => {
  const raw = architecture.structure;
  if (!raw || !Array.isArray(raw.structure)) {
    throw new Error(
      "follow-architecture/structure: architecture.json has no `structure.structure` array"
    );
  }
  return {
    structureRoot: raw.structureRoot ?? "core/ehr",
    longPathsInfo: false,
    ignorePatterns: raw.ignorePatterns ?? [],
    structure: raw.structure,
    ...(raw.rules ? { rules: raw.rules } : {}),
    ...(raw.regexParameters ? { regexParameters: raw.regexParameters } : {}),
  };
};

const folderStructureRule = (architecture) => ({
  rule: "project-structure/folder-structure",
  severity: "error",
  options: [buildFolderStructureConfig(architecture)],
});

module.exports = {
  loadArchitecture,
  buildFolderStructureConfig,
  folderStructureRule,
};
