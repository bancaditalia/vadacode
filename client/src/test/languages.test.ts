// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Language id smoke test.
 */

import * as assert from "assert";
import * as vscode from "vscode";
import { activate } from "./helper";

// Passing arrow functions (aka “lambdas”) to Mocha is discouraged.
// https://mochajs.org/#arrow-functions

suite("Vadacode", () => {
  suite("languages", async function () {
    test("must include datalogpm", async function () {
      await activate();

      const languages = await vscode.languages.getLanguages();

      assert.ok(languages.includes("datalogpm"));
    });
  });
});
