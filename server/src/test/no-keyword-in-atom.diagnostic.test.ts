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

// Duplicated from diagnostics.test.ts - to be refactored
function normalizeMessage(message: string): string {
  return message
    // unify unicode escapes
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\/\\/g, "/")
    .replace(/\\\//g, "/")
    .normalize("NFC");
}

function normalizeDiagnostic(d: any) {
  return {
    ...d,
    message: normalizeMessage(d.message),
  };
}

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

    const receivedDiagnostics = datalogpmDocument.diagnostics
    .filter((diagnostic) => diagnostic.severity !== DiagnosticSeverity.Hint)
    .map((diagnostic) => {
      const { relatedInformation, ...rest } = diagnostic;
      return rest;
    });

    const normalizedReceived = receivedDiagnostics.map(normalizeDiagnostic);
    const normalizedExpecteds = expectedDiagnostics.map(normalizeDiagnostic);

    assert.deepEqual(normalizedReceived, normalizedExpecteds);
  }
}

suite("No keyword in atom diagnostics syntax check", () => {
  test("should report when using a keyword is used in head atom", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `a("one", 3).
mmin(X) :- a(_, _).`,
      [ 
        {
          "code": ErrorTypes.EXTRANEOUS_INPUT_AT_0_EXPECTING_1,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.EXTRANEOUS_INPUT_AT_0_EXPECTING_1}`
          },             
          "message": "Unexpected symbol 'mmin' (expecting '{<EOF>, ID, VAR, '#F', BLOCK_COMMENT, LINE_COMMENT, '@'}').",
          "range": {
            "end": {
              "character": 4,
              "line": 1
            },
            "start": {
              "character": 0,
              "line": 1
            }
          },
          "severity": DiagnosticSeverity.Error,
          source: "source"
        },
        {
          "code": ErrorTypes.ERR_PARSING_ERROR_EXPECTED_0,
          "codeDescription": {
            "href": "https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#1004"
          },
          "message": "Parsing error: ''='' expected.",
          "range": {
            "end": {
              "character": 7,
              "line": 1
            },
            "start": {
              "character": 6,
              "line": 1
            }
          },
          "severity": DiagnosticSeverity.Error,
          "source": "source",
       }]
    );
  });

  test("should report when using a keyword is used in body atom", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `ssum(1) :- msum(X).
@output("ssum").
`,
      [ 
        {
          "code": ErrorTypes.ERR_PARSING_ERROR_EXPECTED_0,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_PARSING_ERROR_EXPECTED_0}`
          },             
          "message": "Parsing error: '{'not', 'dom(*)', '<+>', '◆', '<->', '■', '[-]', '[+]', '/\\', '\\/', '©', '(c)', '(s)', ID}' expected.",
          "range": {
            "end": {
              "character": 15,
              "line": 0
            },
            "start": {
              "character": 11,
              "line": 0
            }
          },
          "severity": DiagnosticSeverity.Error,
          source: "source"
        },
        {
          "code": ErrorTypes.ERR_PARSING_ERROR_EXPECTED_0,
          "codeDescription": {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_PARSING_ERROR_EXPECTED_0}`
          },
          "message": "Parsing error: ''='' expected.",
          "range": {
            "end": {
              "character": 18,
              "line": 0
            },
            "start": {
              "character": 17,
              "line": 0
            }
          },
          "severity": DiagnosticSeverity.Error,
          "source": "source",
       }]
    );
  });


  test("should not kick in when not using a keyword in head atom", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `a("one", 3).
mmi2n(X) :- a(X, _).
@output("mmi2n").`,
      []
    );
  });

});

