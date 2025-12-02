// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Binding hints diagnostics test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
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
    }).filter((diagnostic: Diagnostic) => diagnostic.severity !== DiagnosticSeverity.Hint);

    
    assert.deepEqual(receivedDiagnostics, expectedDiagnostics);
  }
}

suite("No EDB output diagnostics", () => {
  test("should not report errors if only intensional atoms are sent to output", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `company2("mycompany").
company(X) :- company2(X).
@output("company").
@bind("company", "csv", "./", "company.csv").
`,
      []
    );
  });

  test("should report errors if extensional atoms are sent to output", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `company2("mycompany").
company(X) :- company2(X).
@output("company").
@bind("company", "csv", "./", "company.csv").
@output("company2").
`,
      [

        {
          "code": ErrorTypes.ERR_NO_EXTENSIONAL_ATOM_AS_OUTPUT,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_NO_EXTENSIONAL_ATOM_AS_OUTPUT}`
          },
          "message": "Extensional atoms cannot be used as outputs.",
          "range": {
            "end": {
              "character": 17,
              "line": 4
            },
            "start": {
              "character": 9,
              "line": 4
            }
          },
          "severity": DiagnosticSeverity.Error,
          "tags": []
        }    
      ]
    );
  });

});

