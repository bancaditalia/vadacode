// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Unwarded atom diagnostics test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DatalogpmDocument } from "../datalogpm/datalogpm-document";
import { ErrorTypes } from "../datalogpm/diagnostic-messages";
import { Fragment } from 'server/src/isomorphic';

const DOC_URI = "test://test/test.vada";

@Service()
export class DiagnosticsTest {
  async expectDiagnostics(
    content: string,
    fragment: Fragment,
    expectedDiagnostics: Diagnostic[],
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument, fragment);

    const receivedDiagnostics = datalogpmDocument.diagnostics.map((diagnostic) => {
      const { relatedInformation, ...rest } = diagnostic;
      return rest;
    });
    const nonHintReceivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) => diagnostic.severity === DiagnosticSeverity.Error);

    assert.deepEqual(nonHintReceivedDiagnostics, expectedDiagnostics);
  }
}

suite("Weakly Frontier Guarded diagnostics", () => {
  test("should not report diagnostics for a Weakly Frontier Guarded program", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% Weakly Frontier Guarded
% (but not Frontier Guarded, as there is no atom containing 
% X,Y,Z figuring in the head of the rule)
% i[2] is affected
% in second rule, x and z are harmless, y is harmful and dangerous
e("1").
i1(X,Y,S) :- e(X).
i2(X,Y,Z) :- i1(X,Y,_), i1(Z,Y,_).
@output("i2").
`, 'Weakly Frontier Guarded',
      []
    );
  });

  test("should report diagnostics for a non-Weakly Frontier Guarded", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% Datalog E
e("a").
i1(X,Y,S) :- e(X).
i2(S,Y,K) :- i1(X,Y,S), i1(Z,Y,K).
@output("i2").

`, 'Weakly Frontier Guarded',
      [
        {
          code: ErrorTypes.ERR_ATOM_NOT_IN_WEAKLY_FRONTIER_GUARDED_RULE,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_ATOM_NOT_IN_WEAKLY_FRONTIER_GUARDED_RULE}`
          },             
          message:
            "Rule is not Weakly Frontier Guarded, as there is no atom in the body including all dangerous variables in the head.",
          range: {
            end: {
              character: 34,
              line: 3,
            },
            start: {
              character: 0,
              line: 3,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Weakly Frontier Guarded"
          }          
        },
      ]
    );
  });


});