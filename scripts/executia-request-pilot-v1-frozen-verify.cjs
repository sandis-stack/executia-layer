#!/usr/bin/env node
"use strict";

/** @deprecated Use executia-request-pilot-v1-publication-verify.cjs — delegates to publication authority. */

const { spawnSync } = require("child_process");
const path = require("path");

const result = spawnSync(process.execPath, ["executia-request-pilot-v1-publication-verify.cjs"], {
  cwd: __dirname,
  encoding: "utf8",
  stdio: "inherit"
});

process.exit(result.status ?? 1);
