// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file General diagnostics test.
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
    expectedDiagnostics: Diagnostic[],
    filterErrorTypes: ErrorTypes[] = []
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument);

    let receivedDiagnostics = datalogpmDocument.diagnostics.map((diagnostic) => {
      const { relatedInformation, ...rest } = diagnostic;
      return rest;
    });
    let nonHintReceivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) => diagnostic.severity != DiagnosticSeverity.Hint);

    if (filterErrorTypes.length > 0) {
      nonHintReceivedDiagnostics = nonHintReceivedDiagnostics.filter((diagnostic: Diagnostic) =>
        filterErrorTypes.includes(diagnostic.code as ErrorTypes)
      );
      receivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) =>
        filterErrorTypes.includes(diagnostic.code as ErrorTypes)
      );
      assert.notEqual(nonHintReceivedDiagnostics.length, 0, "No diagnostics found after filtering by error types");
      assert.notEqual(receivedDiagnostics.length, 0, "No diagnostics found after filtering by error types");
    }
    

    const normalizedReceived = nonHintReceivedDiagnostics.map(normalizeDiagnostic);
    const normalizedExpecteds = expectedDiagnostics.map(normalizeDiagnostic);

    assert.deepEqual(normalizedReceived, normalizedExpecteds);
  }
}

suite("Diagnostics", () => {
  // No diagnostics
  test("should report nothing in an empty file", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics('', []);
  });

  test("should report nothing when declaring and @outputting an atom", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics('b(1).@output("a").a(X):-b(X).', []);
  });

  // 1000
  test("should report unused atom", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics("a(1).", [
      {
        range: {
          start: {
            line: 0,
            character: 0,
          },
          end: {
            line: 0,
            character: 1,
          },
        },
        severity: DiagnosticSeverity.Warning,
        code: ErrorTypes.ERR_UNUSED_ATOM,
        codeDescription: {
          href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_UNUSED_ATOM}`
        },             
        message: "Unused atom 'a'.",
        tags: [],
      },
    ]);
  });

  // 1001
  test("should report unexpected symbol", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics("a-(1).", [
      {
        range: {
          start: {
            line: 0,
            character: 1,
          },
          end: {
            line: 0,
            character: 2,
          },
        },
        severity: DiagnosticSeverity.Error,
        code: ErrorTypes.ERR_UNEXPECTED_TOKEN_0,
        codeDescription: {
          href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_UNEXPECTED_TOKEN_0}`
        },             
        message: "Unexpected symbol '-'.",
        source: "source",
      },
    ]);
  });

  // 1002
  // Please note that error token position is pretty arbitrary
  // and should be determined by ANTLR, the important things is that
  // the error is detected at the end of the file.
  test("should report unexpected end of file (1 char)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics("a", [
      {
        range: {
          start: {
            line: 0,
            character: 1,
          },
          end: {
            line: 0,
            character: 6,
          },
        },
        severity: DiagnosticSeverity.Error,
        code: ErrorTypes.ERR_UNEXPECTED_EOF,
        codeDescription: {
          href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_UNEXPECTED_EOF}`
        },             
        message: "Unexpected end of file.",
        source: "source",
      },
    ]);
  });

  // 1002
  // Please note that error token position is pretty arbitrary
  // and should be determined by ANTLR, the important things is that
  // the error is detected at the end of the file.
  test("should report unexpected end of file (2 chars)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics("ab", [
      {
        range: {
          start: {
            line: 0,
            character: 2,
          },
          end: {
            line: 0,
            character: 7,
          },
        },
        severity: DiagnosticSeverity.Error,
        code: ErrorTypes.ERR_UNEXPECTED_EOF,
        codeDescription: {
          href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_UNEXPECTED_EOF}`
        },             
        message: "Unexpected end of file.",
        source: "source",
      },
    ]);
  });

  // 1003: Unexpected symbol. Don't know how to trigger (comes from ANTLR).

  // 1004: Parsing error
  test("should report parsing error (1)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics('@output("a").a(X) :-!', [
      {
        range: {
          start: {
            line: 0,
            character: 20,
          },
          end: {
            line: 0,
            character: 21,
          },
        },
        severity: DiagnosticSeverity.Error,
        code: ErrorTypes.ERR_PARSING_ERROR_EXPECTED_0,
        codeDescription: {
          href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_PARSING_ERROR_EXPECTED_0}`
        },             
        message:
          // Note, here we use both escaped and unescaped versions of Unicode characters
          // to ensure that the diagnostics system correctly normalizes them.
          // Normalization is required since MacOS and Linux (used in CI) use
          // different Unicode normalization forms.
          "Parsing error: '{'not', 'dom(*)', '<+>', '\\u25C6', '<->', '■', '[-]', '[+]', '/\\', '\\/', '©', '(c)', '(s)', ID}' expected.",
        source: "source",
      },
    ]);
  });

  // 1007: Missing '{token}' at the end of file. Don't know how to trigger (comes from ANTLR).

  // 1008: Missing '{token1}' before '{token2}'. Don't know how to trigger (comes from ANTLR).

  // 1009: Unexpected symbol '{token1}' (expecting '{token2}').
  test("should report parsing error (2)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      '@output("a").x(1).a(X) :- x(X), not x(X+).',
      [
        {
          range: {
            start: {
              line: 0,
              character: 39,
            },
            end: {
              line: 0,
              character: 40,
            },
          },
          severity: DiagnosticSeverity.Error,
          code: ErrorTypes.EXTRANEOUS_INPUT_AT_0_EXPECTING_1,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.EXTRANEOUS_INPUT_AT_0_EXPECTING_1}`
          },             
          message: "Unexpected symbol '+' (expecting '{',', ')'}').",
          source: "source",
        },
      ]
    );
  });

  // 1010: Unknown parsing error. Don't know how to trigger (comes from ANTLR).

  // 1011: Undeclared atom
  test("should report undeclared atom", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      'a(X) :- b(X).@output("a").',
      [
        {
          range: {
            start: {
              line: 0,
              character: 8,
            },
            end: {
              line: 0,
              character: 9,
            },
          },
          severity: DiagnosticSeverity.Error,
          code: ErrorTypes.ERR_UNDECLARED_ATOM_0,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_UNDECLARED_ATOM_0}`
          },             
          message: "Undeclared atom: b.",
          tags: [],
        },
      ]
    );
  });

  // 1012: Input atom in head
  test("should report @input in atom head", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `@input("a").@bind("a", "csv", "/path", "file.csv").@mapping("a",0,"id","int").
x(1).
a(X) :- x(X).
y(X) :- a(X).
@output("y").`,
      [
        {
          range: {
            start: {
              line: 2,
              character: 0,
            },
            end: {
              line: 2,
              character: 1,
            },
          },
          severity: DiagnosticSeverity.Warning,
          code: ErrorTypes.ERR_INPUT_ATOM_IN_HEAD_0,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_INPUT_ATOM_IN_HEAD_0}`
          },             
          message: "Atom 'a' is used in rule head and as an input. Do you want to create a new atom instead?",
          tags: [],
        },
      ]
    );
  });

  // 1014
  test("should report duplicate @output", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      'b(1).@output("a").@output("a").a(X):-b(X).',
      [
        {
          range: {
            start: {
              line: 0,
              character: 13,
            },
            end: {
              line: 0,
              character: 16,
            },
          },
          severity: DiagnosticSeverity.Error,
          code: ErrorTypes.ERR_ATOM_0_ALREADY_OUTPUT,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_ATOM_0_ALREADY_OUTPUT}`
          },             
          message: "Duplicate @output for atom 'a'.",
          tags: [],
        },
        {
          range: {
            start: {
              line: 0,
              character: 26,
            },
            end: {
              line: 0,
              character: 29,
            },
          },
          severity: DiagnosticSeverity.Error,
          code: ErrorTypes.ERR_ATOM_0_ALREADY_OUTPUT,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_ATOM_0_ALREADY_OUTPUT}`
          },             
          message: "Duplicate @output for atom 'a'.",
          tags: [],
        },
      ]
    );
  });

  // 1015
  test("should report undeclared @outputs", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics('@output("t4").', [
      {
        range: {
          start: {
            line: 0,
            character: 8,
          },
          end: {
            line: 0,
            character: 12,
          },
        },
        severity: DiagnosticSeverity.Error,
        code: ErrorTypes.ERR_NON_EXISTING_OUTPUT_0,
        codeDescription: {
          href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_NON_EXISTING_OUTPUT_0}`
        },             
        message:
          "Atom 't4' has not been declared but is being used as an output.",
        tags: [],
      },
    ]);
  });

    // 1021
    test("should report empty @outputs", async () => {
      const definitionProviderTest = Container.get(DiagnosticsTest);
      await definitionProviderTest.expectDiagnostics('@output("").', [
        {
          range: {
            start: {
              line: 0,
              character: 8,
            },
            end: {
              line: 0,
              character: 10,
            },
          },
          severity: DiagnosticSeverity.Error,
          code: ErrorTypes.ERR_EMPTY_DEFINITION,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_EMPTY_DEFINITION}`
          },             
          message:
            "Definition can't be empty.",
          tags: [],
        },
      ]);
    });

    test("should report empty @inputs", async () => {
      const definitionProviderTest = Container.get(DiagnosticsTest);
      await definitionProviderTest.expectDiagnostics('@input("").', [
        {
          range: {
            start: {
              line: 0,
              character: 7,
            },
            end: {
              line: 0,
              character: 9,
            },
          },
          severity: DiagnosticSeverity.Error,
          code: ErrorTypes.ERR_EMPTY_DEFINITION,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_EMPTY_DEFINITION}`
          },             
          message:
            "Definition can't be empty.",
          tags: [],
        },
      ]);
    });

    test("should report empty @binds", async () => {
      const definitionProviderTest = Container.get(DiagnosticsTest);
      await definitionProviderTest.expectDiagnostics('@bind("").', [
        {
          range: {
            start: {
              line: 0,
              character: 6,
            },
            end: {
              line: 0,
              character: 8,
            },
          },
          severity: DiagnosticSeverity.Error,
          code: ErrorTypes.ERR_EMPTY_DEFINITION,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_EMPTY_DEFINITION}`
          },             
          message:
            "Definition can't be empty.",
          tags: [],
        },
        {
          code: ErrorTypes.ANNOTATION_PARAMETERS,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ANNOTATION_PARAMETERS}`
          },             
          message: 'Expected 4 arguments, but got 1.',
          range: {
            end: {
              character: 5,
              line: 0
            },
            start: {
              character: 1,
              line: 0
            }
          },
          severity: DiagnosticSeverity.Error,
          tags: []
        }        
      ]);
    });


});
