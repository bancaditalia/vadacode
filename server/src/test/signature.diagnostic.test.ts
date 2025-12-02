// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Signature diagnostics test.
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

suite("Signature diagnostics", () => {
  test("should report mismatched number of terms if they don't match", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(`
a(1, 2).
b(X, Z) :- a(X, Y, Z), Y<4.
@output("b").
`
      , [
      {
        "code": ErrorTypes.ATOM_SIGNATURE_TERMS,
        "codeDescription": {
          "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ATOM_SIGNATURE_TERMS}`
        },
        "message": "Expected 2 terms, but got 3.",
          "range": {
            "end": {
              "character": 20,
              "line": 2
            },
            "start": {
              "character": 19,
              "line": 2,
            }
          },
          "severity": DiagnosticSeverity.Error,
          "tags": []
        }        
      ]
    );
  });

  test("should not report mismatched number of terms if they match", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(`
a(1, 2).
b(X, Z) :- a(X, Y), Y<4.
@output("b").
`
      , []
    );
  });

  test("should report correct number of terms with collections (empty list)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(`
projects("Mark",1,[]).
all(X,P) :- projects(X,D1,[P1]), projects(X,D2,P2), D1>D2, P=P1|P2.
@output("all").
`
      , []
    );
  });

  test("should report correct number of terms with collections (list)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(`
projects("Mark",1,[1, 2]).
all(X,P) :- projects(X,D1,[P1]), projects(X,D2,P2), D1>D2, P=P1|P2.
@output("all").
`
      , []
    );
  });

  test("should report correct number of terms with collections (empty set)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(`
projects("Mark",1,{}).
all(X,P) :- projects(X,D1,[P1]), projects(X,D2,P2), D1>D2, P=P1|P2.
@output("all").
`
      , []
    );
  });

  
  test("should report correct number of terms with collections (set)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(`
projects("Mark",1,{1, 2}).
all(X,P) :- projects(X,D1,[P1]), projects(X,D2,P2), D1>D2, P=P1|P2.
@output("all").
`
      , []
    );
  });


});
