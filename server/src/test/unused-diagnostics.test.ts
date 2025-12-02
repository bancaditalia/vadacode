// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Unused diagnostics test.
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

    const receivedDiagnostics = datalogpmDocument.diagnostics;
    const nonHintReceivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) => diagnostic.severity != DiagnosticSeverity.Hint);
    assert.deepEqual(nonHintReceivedDiagnostics, expectedDiagnostics);
  }
}

suite("Unused atom diagnostics", () => {
  // 1000
  test("should not report unused atom even in case of recursion and used as output", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `@input("c").@bind("c", "csv", "/path", "file.csv").@mapping("c",0,"id","int").

% Creation rule
b(X) :- c(X).

% Recursive rule
b(X) :- b(X), Y = X + 1.

% Assignment rule
d(X) :- b(X).

@output("d").`,
      []
    );
  });

  test("should not report unused atom even in case of EGDs", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `@input("c").@bind("c", "csv", "/path", "file.csv").@mapping("c",0,"id","int").

% Creation rule
X=Y :- c(X), c(Y).`,
      []
    );
  });


  test("should not report unused variable if used in aggregation (mprod)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `s(0.1,2,"a").
s(0.2,2,"a").
s(0.5,3,"a").
s(0.6,4,"b").
s(0.5,5,"b").

f(J,Z) :- s(X,Y,Z), J = mprod(X,<Y>).
@output("f").`,
      []
    );
  });

  test("should report unused variable if not used in aggregation (mprod)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `s(0.1, 2, "a", "d").
s(0.2, 2, "a", "d").
s(0.5, 3, "a", "d").
s(0.6, 4, "b", "d").
s(0.5, 5, "b", "d").

f(J,Z) :- s(X,Y,Z, W), J = mprod(X,<Y>).
@output("f").`,
      [
        {
          "code": "1025",
          "codeDescription": {
            "href": "https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#1025"
          },
          "message": "Variable W is not used in the head. You should make it anonymous (replacing it with an `_`).",
          "range": {
            "end": {
              "character": 20,
              "line": 6
            },
            "start": {
              "character": 19,
              "line": 6
            }
          },
          "relatedInformation": [
            {
              "location": {
                "range": {
                  "end": {
                    "character": 20,
                    "line": 6
                  },
                  "start": {
                    "character": 19,
                    "line": 6
                  }
                },
                "uri": "test://test/test.vada"
              },
              "message": "If a variable is not used in the head of a rule, it should be replaced with an underscore ('_') to indicate that it is anonymous. For example, instead of using 'X' in the head, use '_' if 'X' is not used."
            }
          ],
          "severity": DiagnosticSeverity.Warning,
          "tags": []
        }
      ]
);
  });

  test("should not report unused variable if used in aggregation (msum)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `s(0.1,2,"a").
s(0.2,2,"a").
s(0.5,3,"a").
s(0.6,4,"b").
s(0.5,5,"b").

f(J,Z) :- s(X,Y,Z), J = msum(X,<Y>).
@output("f").`,
      []
    );
  });

  test("should not report unused variable if used in aggregation (mcount)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `s(0.1,2,"a").
s(0.2,2,"a").
s(0.5,3,"a").
s(0.6,4,"b").
s(0.5,5,"b").

f(J,Z) :- s(X,Y,Z), J = mcount(X,<Y>).
@output("f").`,
      []
    );
  });

  test("should not report unused variable if used in aggregation (munion)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `s(0.1,2,"a").
s(0.2,2,"a").
s(0.5,3,"a").
s(0.6,4,"b").
s(0.5,5,"b").

f(J,Z) :- s(X,Y,Z), J = munion(X,<Y>).
@output("f").`,
      []
    );
  });

  test("should not report unused variable if used in aggregation (union)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `s(0.1,2,"a").
s(0.2,2,"a").
s(0.5,3,"a").
s(0.6,4,"b").
s(0.5,5,"b").

f(J,Z) :- s(X,Y,Z), J = union(X,<Y>).
@output("f").`,
      []
    );
  });

  test("should not report unused variable if used in aggregation (list)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `s(0.1,2,"a").
s(0.2,2,"a").
s(0.5,3,"a").
s(0.6,4,"b").
s(0.5,5,"b").

f(J,Z) :- s(X,Y,Z), J = list(X,<Y>).
@output("f").`,
      []
    );
  });

  test("should not report unused variable if used in aggregation (set)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `s(0.1,2,"a").
s(0.2,2,"a").
s(0.5,3,"a").
s(0.6,4,"b").
s(0.5,5,"b").

f(J,Z) :- s(X,Y,Z), J = set(X,<Y>).
@output("f").`,
      []
    );
  });

  test("should not report unused variable if used in aggregation (sum)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `s(0.1,2,"a").
s(0.2,2,"a").
s(0.5,3,"a").
s(0.6,4,"b").
s(0.5,5,"b").

f(J,Z) :- s(X,Y,Z), J = sum(X,<Y>).
@output("f").`,
      []
    );
  });

  test("should not report unused variable if used in aggregation (prod)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `s(0.1,2,"a").
s(0.2,2,"a").
s(0.5,3,"a").
s(0.6,4,"b").
s(0.5,5,"b").

f(J,Z) :- s(X,Y,Z), J = prod(X,<Y>).
@output("f").`,
      []
    );
  });

  test("should not report unused variable if used in aggregation (avg)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `s(0.1,2,"a").
s(0.2,2,"a").
s(0.5,3,"a").
s(0.6,4,"b").
s(0.5,5,"b").

f(J,Z) :- s(X,Y,Z), J = avg(X,<Y>).
@output("f").`,
      []
    );
  });

  test("should not report unused variable if used in aggregation (count)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `s(0.1,2,"a").
s(0.2,2,"a").
s(0.5,3,"a").
s(0.6,4,"b").
s(0.5,5,"b").

f(J,Z) :- s(X,Y,Z), J = count(X,<Y>).
@output("f").`,
      []
    );
  });


});
