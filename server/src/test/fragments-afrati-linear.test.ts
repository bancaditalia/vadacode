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

suite("Afrati Linear diagnostics", () => {

  test("should not report diagnostics for a Afrati Linear program (guarded)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% Afrati Linear
human("andrea").
person(X) :- human(X).
human2(X,Y) :- person(X), human(X).
@output("human2").
`, 'Afrati Linear',
      []
    );
  });
  
  test("should not report diagnostics for a Afrati Linear program (non guarded)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% Afrati Linear
parent("andrea", "mario").
ancestor(X, Y) :- parent(X, Y).
ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).
person(X, C) :- parent(X, Y).
`, 'Afrati Linear',
      []
    );
  });

  test("should report diagnostics for a non-Afrati Linear", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% Guarded. s is the guard
g("a", "b").
s(X, Y) :- g(X, Y).
t(X,Z) :- s(X,Y), s(X,Y).
@output("t").
`, 'Afrati Linear',
      [
        {
          code: ErrorTypes.NON_AFRATI_LINEAR_JOIN,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.NON_AFRATI_LINEAR_JOIN}`
          },
          message:
            "Rule is not AfratiLienar: predicate 's' is intensional and appears in the body of a rule with another intensional predicate.",
          range: {
            end: {
              character: 11,
              line: 3,
            },
            start: {
              character: 10,
              line: 3,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Afrati Linear"
          }          
        },
        {
          code: ErrorTypes.NON_AFRATI_LINEAR_JOIN,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.NON_AFRATI_LINEAR_JOIN}`
          },             
          message:
            "Rule is not AfratiLienar: predicate 's' is intensional and appears in the body of a rule with another intensional predicate.",
          range: {
            end: {
              character: 19,
              line: 3,
            },
            start: {
              character: 18,
              line: 3,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Afrati Linear"
          }          
        },
      ]
    );
  });


});