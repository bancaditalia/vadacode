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
    expectedDiagnostics: Diagnostic[],
    filterHints = true
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument);

    const receivedDiagnostics = (filterHints ? datalogpmDocument.diagnostics.filter((diagnostic) => diagnostic.severity !== DiagnosticSeverity.Hint) : datalogpmDocument.diagnostics)
    .map((diagnostic) => {
      const { relatedInformation, ...rest } = diagnostic;
      return rest;
    });
    assert.deepEqual(receivedDiagnostics, expectedDiagnostics);
  }
}

suite("Unbound input atom diagnostics", () => {
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
        }],
        false
    );
  });

  test("should report input atom if it's not bounded (with mappings)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `@input("p").
@mapping("p", 0, "p.name", "string").
@mapping("p", 1, "p.size", "double").
@mapping("p", 2, "p.age", "int").
@mapping("p", 3, "p.payed", "boolean").
@mapping("p", 4, "p.born", "date").
@mapping("p", 5, "friends", "list").

person(Name, Size, Age, Payed, Born, Friends) :- p(Name, Size, Age, Payed, Born, Friends).

@output("person").`,
      [ 
        {
          "code": ErrorTypes.ERR_NO_BINDINGS_FOR_INPUT_0,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_NO_BINDINGS_FOR_INPUT_0}`
          },             
          "message": "Input 'p' has no bindings. Add @bind and @mapping rules.",
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

  test("should not report input atom if it's bounded with bind", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `@input("p").
@mapping("p", 0, "p.name", "string").
@mapping("p", 1, "p.size", "double").
@mapping("p", 2, "p.age", "int").
@mapping("p", 3, "p.payed", "boolean").
@mapping("p", 4, "p.born", "date").
@mapping("p", 5, "friends", "list").
@bind("p", "csv", "/path", "file.csv").

person(Name, Size, Age, Payed, Born, Friends) :- p(Name, Size, Age, Payed, Born, Friends).

@output("person").`,
      []
    );
  });

  test("should not report input atom if it's bounded with qbind", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `@input("p").
@mapping("p", 0, "p.name", "string").
@mapping("p", 1, "p.size", "double").
@mapping("p", 2, "p.age", "int").
@mapping("p", 3, "p.payed", "boolean").
@mapping("p", 4, "p.born", "date").
@mapping("p", 5, "friends", "list").
@qbind("p", "neo4j", "", "MATCH (p:Person) RETURN p.name, p.size, p.age, p.payed, p.born, [(p)-[knows]->(f) WHERE f:Person | f.name ] as friends").

person(Name, Size, Age, Payed, Born, Friends) :- p(Name, Size, Age, Payed, Born, Friends).

@output("person").`,
      []
    );
  });

});

suite("Unbound output atom diagnostics", () => {
  test("should report output atom if it's not bounded", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `@output("c").a(1).c(X):-a(1).`,
      [ 
        {
          "code": ErrorTypes.NO_BINDINGS_FOR_OUTPUT_0,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.NO_BINDINGS_FOR_OUTPUT_0}`
          },             
          "message": "Output 'c' has no bindings, output will be sent with the response.",
          "range": {
            "end": {
              "character": 11,
              "line": 0
            },
            "start": {
              "character": 8,
              "line": 0
            }
          },
          "severity": DiagnosticSeverity.Hint,
          "tags": []
        }],
        false
    );
  });
});
