#!/usr/bin/env node
"use strict";

/** @deprecated Use executia-request-pilot-v1-frozen-verify.cjs — delegates to frozen authority. */

const { spawnSync } = require("child_process");
const path = require("path");

const result = spawnSync(process.execPath, ["executia-request-pilot-v1-frozen-verify.cjs"], {
  cwd: __dirname,
  encoding: "utf8",
  stdio: "inherit"
});

process.exit(result.status ?? 1);
