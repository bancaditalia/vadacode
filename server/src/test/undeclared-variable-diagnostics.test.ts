// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Undeclared variable diagnostics test.
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
    const nonHintReceivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) => diagnostic.severity != DiagnosticSeverity.Hint);
    assert.deepEqual(nonHintReceivedDiagnostics, expectedDiagnostics);
  }
}

suite("Undeclared atom diagnostics", () => {
  test("should report an undeclared variable if a condition uses a variable not used in a positive atom.", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `t(1,2).w(X,Y) :- t(X,Y), X <> Z.@output("w").`,
      [
        {
          "code": ErrorTypes.UNDECLARED_VARIABLE,
          "codeDescription": {
            "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.UNDECLARED_VARIABLE}`
          },
          "message": "Variable 'Z' is not bound. Bind it either in a positive atom or in an assignment.",
          "range": {
            "end": {
              "character": 31,
              "line": 0
            },
            "start": {
              "character": 30,
              "line": 0
            }
          },
          "severity": DiagnosticSeverity.Error,
          "tags": []
        }
      ]
    );
  });

  test("should not report a variable used in a condition if it's declared with an assignment.", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `t(1,2).w(X,Y) :- t(X,Y), Z=4,X <> Z.@output("w").`,
      []
    );
  });

  test("should not report a variable used in a condition if it's bound in a positive atom.", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `t(1,2).w(X,Y) :- t(X,Y), X <> Y.@output("w").`,
      []
    );
  });

  test("should report an undeclared variable if a condition uses a variable used only in a negative atom.", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `t(1,2).w(X,Y) :- t(X,Y), not t(X,Z), X <> Z.@output("w").`,
      [
        {
          "code": ErrorTypes.UNDECLARED_VARIABLE,
          "codeDescription": {
            "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.UNDECLARED_VARIABLE}`
          },
          "message": "Variable 'Z' is not bound. Bind it either in a positive atom or in an assignment.",
          "range": {
            "end": {
              "character": 34,
              "line": 0
            },
            "start": {
              "character": 33,
              "line": 0
            }
          },
          "severity": DiagnosticSeverity.Error,
          "tags": []
        },
        {
          "code": ErrorTypes.UNDECLARED_VARIABLE,
          "codeDescription": {
            "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.UNDECLARED_VARIABLE}`
          },
          "message": "Variable 'Z' is not bound. Bind it either in a positive atom or in an assignment.",
          "range": {
            "end": {
              "character": 43,
              "line": 0
            },
            "start": {
              "character": 42,
              "line": 0
            }
          },
          "severity": DiagnosticSeverity.Error,
          "tags": []
        }
      ]
    );
  });


});
