// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Diagnostics smoke test.
 */

import * as vscode from "vscode";
import * as assert from "assert";
import { getDocUri, activate } from "./helper";

// Passing arrow functions (aka “lambdas”) to Mocha is discouraged.
// https://mochajs.org/#arrow-functions

suite("Diagnostics", () => {
  suite("unused atoms", async function () {
    test("must be reported single", async function () {
      await testDiagnostics(getDocUri("diagnostics-unused-atom-00.vada"), [
        {
          severity: vscode.DiagnosticSeverity.Warning,
          message: "Unused atom 'a'.",
          range: toRange(0, 0, 0, 1),
          code: "1000",
        },
      ]);
    });

    test("must be reported multiple", async function () {
      await testDiagnostics(getDocUri("diagnostics-unused-atom-01.vada"), [
        {
          severity: vscode.DiagnosticSeverity.Warning,
          message: "Unused atom 'a'.",
          range: toRange(0, 0, 0, 1),
          code: "1000",
        },
        {
          severity: vscode.DiagnosticSeverity.Warning,
          message: "Unused atom 'bc'.",
          range: toRange(1, 0, 1, 2),
          code: "1000",
        },
      ]);
    });
  });

  suite("parse error", async function () {
    test("unexpected symbol", async function () {
      await testDiagnostics(getDocUri("diagnostics-parse-error-00.vada"), [
        {
          severity: vscode.DiagnosticSeverity.Error,
          message: "Extensional atoms cannot be used as outputs.",
          range: toRange(1, 9, 1, 10),
          code: "1001",
        },
        {
          severity: vscode.DiagnosticSeverity.Error,
          message: "Unexpected symbol 'b'.",
          range: toRange(0, 2, 0, 3),
          code: "1001",
        },
      ]);
    });
  });

  suite("parse error", async function () {
    test("unexpected symbol", async function () {
      await testDiagnostics(getDocUri("diagnostics-parse-error-01.vada"), [
        {
          severity: vscode.DiagnosticSeverity.Error,
          message: "Extensional atoms cannot be used as outputs.",
          range: toRange(1, 9, 1, 10),
          code: "1001",
        },
        {
          severity: vscode.DiagnosticSeverity.Error,
          message: "Unexpected symbol 'c'.",
          range: toRange(0, 2, 0, 3),
          code: "1001",
        },
      ]);
    });
  });
});

function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
  const start = new vscode.Position(sLine, sChar);
  const end = new vscode.Position(eLine, eChar);
  return new vscode.Range(start, end);
}

async function testDiagnostics(
  docUri: vscode.Uri,
  expectedDiagnostics: vscode.Diagnostic[]
) {
  await activate(docUri);

  const actualDiagnostics = vscode.languages.getDiagnostics(docUri)
  .filter(diagnostic => diagnostic.severity !== vscode.DiagnosticSeverity.Hint);

  assert.strictEqual(actualDiagnostics.length, expectedDiagnostics.length, "Number of diagnostics does not match expected count.");

  expectedDiagnostics.forEach((expectedDiagnostic, i) => {
    const actualDiagnostic = actualDiagnostics[i];
    assert.equal(actualDiagnostic.message, expectedDiagnostic.message, "Diagnostic message does not match expected.");
    assert.deepEqual(actualDiagnostic.range, expectedDiagnostic.range, "Diagnostic range does not match expected.");
    assert.equal(actualDiagnostic.severity, expectedDiagnostic.severity, "Diagnostic severity does not match expected.");
  });
}
