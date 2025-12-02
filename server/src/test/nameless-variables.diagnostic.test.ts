// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Nameless variables diagnostics test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import {
  Diagnostic,
  DiagnosticSeverity
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DefinitionProviderService } from "../definition-provider.service";
import { DocumentManagerService } from "../document-manager.service";
import { ErrorTypes } from '../datalogpm/diagnostic-messages';
import { DatalogpmDocument } from "../datalogpm/datalogpm-document";

const DOC_URI = "test://test/test.vada";

@Service()
export class DiagnosticsTest {
  constructor(
    public definitionProviderService: DefinitionProviderService,
    public documentManagerService: DocumentManagerService
  ) {}

  async expectDiagnostics(
    content: string,
    expectedDiagnostics: Diagnostic[]
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument);
    const receivedDiagnostics = datalogpmDocument.diagnostics.map((diagnostic) => {
      const { relatedInformation, ...rest } = diagnostic;
      return rest;
    });
    const nonHintReceivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) => diagnostic.severity != DiagnosticSeverity.Hint);
    
    assert.deepEqual(nonHintReceivedDiagnostics, expectedDiagnostics);
  }
}

suite("Nameless variables diagnostics", () => {
  test("should report unused variable if single and not used in conditions", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(`
a(1, 2).
b(X) :- a(X, Y).
@output("b").
`
      , [
        {
            "code": ErrorTypes.ANONYMOUS_VARIABLE,
            codeDescription: {
              href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ANONYMOUS_VARIABLE}`
            },
            "message": "Variable Y is not used in the head. You should make it anonymous (replacing it with an `_`).",
            "range": {
              "end": {
                "character": 14,
                "line": 2
              },
              "start": {
                "character": 13,
                "line": 2
              }
            },
            "severity": DiagnosticSeverity.Warning,
            "tags": []
          }    ]);
  });

  test("should not report unused variable if used in conditions", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(`
a(1, 2).
b(X) :- a(X, Y), Y<4.
@output("b").
`
      , []);
  });

  test("should not report unused variable if used in join", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(`
a(1, 2).
b(X) :- a(X, Y), a(X, Y).
@output("b").
`
      , []);
  });

});
