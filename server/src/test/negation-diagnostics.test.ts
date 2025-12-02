// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Negation diagnostics test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DefinitionProviderService } from "../definition-provider.service";
import { DocumentManagerService } from "../document-manager.service";
import { ErrorTypes } from "../datalogpm/diagnostic-messages";
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
    const nonHintReceivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) => diagnostic.severity === DiagnosticSeverity.Error);
    
    assert.deepEqual(nonHintReceivedDiagnostics, expectedDiagnostics);
  }
}

suite("Negation diagnostics", () => {
  test("should report a bad use of variable in the head and negated body it does not appear in a positive body binding", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `teacher("alice", "bob").
person("bob").

teaches(X, Name) :- person(X), not teacher(X, Name).
@output("teaches").`,
      [
        {
          "code": ErrorTypes.INVALID_NEGATION_POSITIVE_BODY_0,
          "codeDescription": {
            "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.INVALID_NEGATION_POSITIVE_BODY_0}`
          },
          "message": "Variable 'Name' does not occur in a non-negated body atom. Every variable that occurs in the head and in a body negation must have a binding in a non-negated atom.",
          "range": {
            "end": {
              "character": 15,
              "line": 3
            },
            "start": {
              "character": 11,
              "line": 3
            }
          },
          "severity": DiagnosticSeverity.Error,
          "tags": []
        },
        {
          "code": ErrorTypes.INVALID_NEGATION_POSITIVE_BODY_0,
          "codeDescription": {
            "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.INVALID_NEGATION_POSITIVE_BODY_0}`
          },
          "message": "Variable 'Name' does not occur in a non-negated body atom. Every variable that occurs in the head and in a body negation must have a binding in a non-negated atom.",
          "range": {
            "end": {
              "character": 50,
              "line": 3
            },
            "start": {
              "character": 46,
              "line": 3
            }
          },
          "severity": DiagnosticSeverity.Error,
          "tags": []
        }
      ]
    );
  });

  test("should not report a use of variable negated body if it appears in a positive body binding", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `teacher("alice", "bob").
friend("bob", "carl").

notTeaches(X) :- friend(X, Name), not teacher(X, Name).
@output("notTeaches").`,
      []
    );
  });

  test("should not report a use of variable in the head and negated body if it appears in a positive body binding", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `teacher("alice", "bob").
friend("bob", "carl").

notTeaches(X, Name) :- friend(X, Name), not teacher(X, Name).

@output("notTeaches").`,
      []
    );
  });
});
