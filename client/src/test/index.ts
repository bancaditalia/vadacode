// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file e2e test runner.
 */

import * as path from "path";
import * as Mocha from "mocha";
import { glob } from "glob";

/**
 * Runs all .test.js tests located in the this folder.
 */
export async function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
  });
  mocha.timeout(100000);

  const testsRoot = __dirname;

  const files = await glob("**.test.js", { cwd: testsRoot });
  console.log("Processing files:", files);

  // Add files to the test suite
  files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

  // Run the mocha test
  function runMochaTests() {
    return new Promise(
      (resolve: (failures: number) => void, reject: () => void) => {
        mocha.run((failures) => {
          if (failures == 0) {
            process.exitCode = 0;
            resolve(0);
          } else {
            process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures
            reject();
          }
        });
      }
    );
  }
  await runMochaTests();
}
