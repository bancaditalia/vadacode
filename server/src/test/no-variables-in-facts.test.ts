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
import { Diagnostic } from "vscode-languageserver";
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
    expectedDiagnostics: Diagnostic[],
    errorTypes: ErrorTypes[] = []
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument);

    let receivedDiagnostics = datalogpmDocument.diagnostics.map((diagnostic) => {
      const { relatedInformation, ...rest } = diagnostic;
      return rest;
    });
    if (errorTypes.length > 0) {
      receivedDiagnostics = receivedDiagnostics.filter((diagnostic) =>
        errorTypes.includes(diagnostic.code as ErrorTypes)
      );
    }

    assert.deepEqual(receivedDiagnostics, expectedDiagnostics);
  }
}

suite("No variables in facts", () => {
  test("should not report errors with constants", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `a(1).
`,
      [], [ErrorTypes.ERR_NO_VARIABLES_IN_FACT]
    );
  });

  test("should report errors with variables", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `test(X, Y).
  a(X) :- test(X, _).
  @output("a").
  `,
      [
      {
        code: ErrorTypes.ERR_NO_VARIABLES_IN_FACT,
        codeDescription: {
        href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_NO_VARIABLES_IN_FACT}`
        },
        message: "Variables are not allowed in facts.",
        range: {
        end: {
          character: 6,
          line: 0
        },
        start: {
          character: 5,
          line: 0
        }
        },
        severity: 1,
        tags: []
      },
      {
        code: ErrorTypes.ERR_NO_VARIABLES_IN_FACT,
        codeDescription: {
          href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_NO_VARIABLES_IN_FACT}`
        },
        message: "Variables are not allowed in facts.",
        range: {
        end: {
          character: 9,
          line: 0
        },
        start: {
          character: 8,
          line: 0
        }
        },
        severity: 1,
        tags: []
      }
      ],
      [ErrorTypes.ERR_NO_VARIABLES_IN_FACT]
    );
  });

});

