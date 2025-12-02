// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file RollupJS plugin to silence non-offending warnings
 * coming from certain libraries.
 */

import * as path from "path";

// Disable eslint check of console symbol
/* eslint-disable no-undef */

// Silence circular dependencies warnings:
// https://github.com/rollup/rollup/issues/1089#issuecomment-402109607

export default function silenceWarnings() {
  const checks = [
    // Silence circular dependency warning for typedi
    {
      check: (warning) =>
        warning.code === "CIRCULAR_DEPENDENCY" &&
        warning.message.indexOf(path.normalize("node_modules/typedi/esm5")) >=
          0,
      message: "Silenced {0} circular dependency warning for typedi.",
      count: 0,
    },
    // Silence sourcemap error warnings for libraries in node_modules, we can't do anything about it
    {
      check: (warning) =>
        warning.code === "SOURCEMAP_ERROR" &&
        warning.id.indexOf(path.normalize("node_modules")) >= 0,
      message: "Silenced {0} sourcemap warnings for node_modules libraries.",
      count: 0,
    },
    // Silence "this is undefined" warnings for libraries in node_modules, we can't do anything about it
    {
      check: (warning) =>
        warning.code === "THIS_IS_UNDEFINED" &&
        warning.id.indexOf(path.normalize("node_modules")) >= 0,
      message: "Silenced {0} 'this is undefined' for node_modules libraries.",
      count: 0,
    },
  ];

  return {
    // Name of the plugin
    name: "silence-warnings",
    buildStart() {
      this.info("Vadacode Language Server build: silencing warnings...");
      // Reset the warning count at the start of each build
      for (const checkIndex in checks) {
        checks[checkIndex].count = 0;
      }
    },
    // Hook into the warning event to increment the counter
    onLog(level, warning) {
      for (const checkIndex in checks) {
        const check = checks[checkIndex];
        if (level == "warn" && check.check(warning)) {
          check.count++;
          // Filter out the warning
          return false;
        }
      }
    },
    generateBundle() {
      for (const checkIndex in checks) {
        const check = checks[checkIndex];
        if (check.count > 0) {
          const message = check.message.replace("{0}", check.count);
          this.info(`- ${message}`);
        }
      }
    },
  };
}
