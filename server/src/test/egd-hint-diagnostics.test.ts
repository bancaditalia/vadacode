// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file EGD hint diagnostics test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DefinitionProviderService } from "../definition-provider.service";
import { DocumentManagerService } from "../document-manager.service";
import { DatalogpmDocument } from "../datalogpm/datalogpm-document";
import { ErrorTypes } from "../datalogpm/diagnostic-messages";

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
    const hintReceivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) => diagnostic.severity == DiagnosticSeverity.Hint);
    
    assert.deepEqual(hintReceivedDiagnostics, expectedDiagnostics);
  }
}

suite("EGD hint diagnostics", () => {
  test("should report equal sign in a EGD as an EGD equal", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `parent_of(1, 2).Parent1=Parent2 :- parent_of(Parent1, Child1), parent_of(Parent2, Child2).`,
      [     
         {
          "code": ErrorTypes.HINT_EGD_0_1,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.HINT_EGD_0_1}`
          },
          "message": "Equality-generating dependency: existential variables are made equal in the reasoning process.",
          "range": {
            "end": {
              "character": 24,
              "line": 0
            },
            "start": {
              "character": 23,
              "line": 0
            },
          },
          "severity": DiagnosticSeverity.Hint,
          "tags": []
        }]
    );
  });

  test("should not report equal sign in a EGD as an EGD equal", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `parent_of(1, 2).parent_at(Parent1, Child1) :- parent_of(Parent2, Child2), Child2=5.`,
      []
    );
  });

});
