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

suite("Linear diagnostics", () => {
  test("should not report diagnostics for a Linear program", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% Linear
human("andrea").
person(X) :- human(X).
parent(X,Y) :- person(X).
person(Y) :- parent(_,Y).
@output("person").

`, 'Linear',
      []
    );
  });

  test("should report diagnostics for a non-Linear", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% Afrati Linear
human("andrea").
person(X) :- human(X).
human2(X,Y) :- person(X), human(X).
@output("human2").
`, 'Linear',
      [
        {
          code: ErrorTypes.NON_LINEAR_RULE,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.NON_LINEAR_RULE}`
          },
          message:
            "Rule is not linear, since there are multiple atoms in the body.",
          range: {
            end: {
              character: 35,
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
            fragmentViolation: "Linear"
          }          
        },
      ]
    );
  });


});