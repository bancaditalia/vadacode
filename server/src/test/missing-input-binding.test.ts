// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Missing input binding diagnostics test.
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
    });
    assert.deepEqual(receivedDiagnostics, expectedDiagnostics);
  }
}

suite("Unbound input atom diagnostics", () => {
  // 1000
  test("should report input atom if it's not bounded", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `@input("c").`,
      [ 
        {
          "code": ErrorTypes.ERR_NO_BINDINGS_FOR_INPUT_0,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_NO_BINDINGS_FOR_INPUT_0}`
          },             
          "message": "Input 'c' has no bindings. Add @bind and @mapping rules.",
          "range": {
            "end": {
              "character": 10,
              "line": 0
            },
            "start": {
              "character": 7,
              "line": 0
            }
          },
          "severity": DiagnosticSeverity.Warning,
          "tags": []
        }]
    );
  });
});

suite("Unbound input atom diagnostics", () => {
  test("should not report input atom if it's not bounded", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      '@input("i2").@bind("i2", "csv", "/path/", "i2.csv").',
      []
    );
  });
});
