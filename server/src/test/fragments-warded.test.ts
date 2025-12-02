// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Unwarded atom diagnostics test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import { Fragment } from 'server/src/isomorphic';
import Container, { Service } from "typedi";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ErrorTypes } from "../datalogpm/diagnostic-messages";
import { DatalogpmDocument } from "../datalogpm/datalogpm-document";

const DOC_URI = "test://test/test.vada";

@Service()
export class DiagnosticsTest {
  async expectDiagnostics(
    content: string,
    fragment: Fragment,
    expectedDiagnostics: Diagnostic[],
    expectedErrorCode?: ErrorTypes,
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument, fragment);

    let receivedDiagnostics = datalogpmDocument.diagnostics.map((diagnostic) => {
      const { relatedInformation, ...rest } = diagnostic;
      return rest;
    });
    if (expectedErrorCode) {
      receivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) => diagnostic.code === expectedErrorCode);
      
    }
    const nonHintReceivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) => diagnostic.severity === DiagnosticSeverity.Error);

    assert.deepEqual(nonHintReceivedDiagnostics, expectedDiagnostics);
  }
}

// Note that some other tests for Warded fragment are in other test units, 
// in the future we will probably want to consolidate them per-analyzer.
suite("Warded diagnostics", () => {
  test("should check variables used in a tainted position and in a filter operation", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `p(X,Y,Z) :- arc(X,Y).
Y = Z :- p(_,Y,Z).
f(X,Y) :- p(X,Y,Z), Z = 7.
@output("f").
arc(3,5).
`, 'Warded',
    [
      {
        "code": ErrorTypes.ERR_VARIABLE_IN_TAINTED_POSITION_IS_USED_IN_FILTER_0,
        "codeDescription": {
          "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IN_TAINTED_POSITION_IS_USED_IN_FILTER_0}`
        },
        "data": {
          "fragmentViolation": "Warded"
        },
        "message": "Variable 'Z' is in a tainted position and used in a filter operation.",
        "range": {
          "end": {
            "character": 17,
            "line": 2
          },
          "start": {
            "character": 16,
            "line": 2
          }
        },
        "severity": DiagnosticSeverity.Error,
        "tags": []
      },
      {
        "code": ErrorTypes.ERR_VARIABLE_IN_TAINTED_POSITION_IS_USED_IN_FILTER_0,
        "codeDescription": {
          "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IN_TAINTED_POSITION_IS_USED_IN_FILTER_0}`
        },
        "data": {
          "fragmentViolation": "Warded"
        },
        "message": "Variable 'Z' is in a tainted position and used in a filter operation.",
        "range": {
          "end": {
            "character": 21,
            "line": 2
          },
          "start": {
            "character": 20,
            "line": 2
          }
        },
        "severity": DiagnosticSeverity.Error,
        "tags": []
      }
    ]);
  });

  test("should check literals appearing in tainted positions (string)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `p(X,Y,Z) :- arc(X,Y).
Y = Z :- p(X,Y,Z).
f(X,Y) :- p(X,Y,"a"), Z = 7.
@output("f").
arc(3,5).
`, 'Warded',
    [
      {
        "code": ErrorTypes.ERR_LITERAL_IN_TAINTED_POSITION,
        "codeDescription": {
          "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_LITERAL_IN_TAINTED_POSITION}`
        },
        "data": {
          "fragmentViolation": "Warded"
        },
        "message": "Literal '\"a\"' is used in a tainted position.",
        "range": {
          "end": {
            "character": 19,
            "line": 2
          },
          "start": {
            "character": 16,
            "line": 2
          }
        },
        "severity": DiagnosticSeverity.Error,
        "tags": []
      }
    ]);  
  });

  test("should check literals appearing in tainted positions (int)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `p(X,Y,Z) :- arc(X,Y).
Y = Z :- p(X,Y,Z).
f(X,Y) :- p(X,Y,10), Z = 7.
@output("f").
arc(3,5).
`, 'Warded',
    [
      {
        "code": ErrorTypes.ERR_LITERAL_IN_TAINTED_POSITION,
        "codeDescription": {
          "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_LITERAL_IN_TAINTED_POSITION}`
        },
        "data": {
          "fragmentViolation": "Warded"
        },
        "message": "Literal '10' is used in a tainted position.",
        "range": {
          "end": {
            "character": 18,
            "line": 2
          },
          "start": {
            "character": 16,
            "line": 2
          }
        },
        "severity": DiagnosticSeverity.Error,
        "tags": []
      }
    ]);  
  });


  test("should check literals appearing in tainted positions (int, propagated)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `p(X,Y,Z) :- arc(X,Y).
Y = Z :- p(X,Y,Z).
f(X,Z) :- p(X,Y,Z).
g(X,Q,Y) :- f(X,Y).
r(X,Q,Y) :- g(10,10,10).
@output("r").
arc(1,2).
`, 'Warded',
    [
      {
        "code": ErrorTypes.ERR_LITERAL_IN_TAINTED_POSITION,
        "codeDescription": {
          "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_LITERAL_IN_TAINTED_POSITION}`
        },
        "data": {
          "fragmentViolation": "Warded"
        },
        "message": "Literal '10' is used in a tainted position.",
        "range": {
          "end": {
            "character": 22,
            "line": 4
          },
          "start": {
            "character": 20,
            "line": 4
          }
        },
        "severity": DiagnosticSeverity.Error,
        "tags": []
      }
    ]);  
  });

  test("should check literals appearing in tainted positions (alternative)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `p(X,Y,Z) :- arc(X,Y).
f(X,Z) :- p(X,Y,Z).
g(X,Q,Y) :- f(X,Y), X = 10.
r(Y,Q) :- g(X,Q,Y), Q > 23.
Y = Q  :- r(Y,Q).
@output("r").
`, 'Warded',
        [
      {
        "code": ErrorTypes.ERR_VARIABLE_IN_TAINTED_POSITION_IS_USED_IN_FILTER_0,
        "codeDescription": {
          "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_IN_TAINTED_POSITION_IS_USED_IN_FILTER_0}`
        },
        "data": {
          "fragmentViolation": "Warded"
        },
        "message": "Variable 'Q' is in a tainted position and used in a filter operation.",
        "range": {
          "end": {
            "character": 5,
            "line": 3
          },
          "start": {
            "character": 4,
            "line": 3
          }
        },
        "severity": DiagnosticSeverity.Error,
        "tags": []
      },
      {
        "code": "1045",
        "codeDescription": {
          "href": "https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#1045"
        },
        "data": {
          "fragmentViolation": "Warded"
        },
        "message": "Variable 'Q' is in a tainted position and used in a filter operation.",
        "range": {
          "end": {
            "character": 15,
            "line": 3
          },
          "start": {
            "character": 14,
            "line": 3
          }
        },
        "severity": 1,
        "tags": []
      },
      {
        "code": "1045",
        "codeDescription": {
          "href": "https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#1045"
        },
        "data": {
          "fragmentViolation": "Warded"
        },
        "message": "Variable 'Q' is in a tainted position and used in a filter operation.",
        "range": {
          "end": {
            "character": 21,
            "line": 3
          },
          "start": {
            "character": 20,
            "line": 3
          }
        },
        "severity": 1,
        "tags": []
    }
    ], ErrorTypes.ERR_VARIABLE_IN_TAINTED_POSITION_IS_USED_IN_FILTER_0);  
  });

  test("should not propagate taintedness to edb", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `a(1,2,3).
b(X,Y,Z) :- a(X,Y,W), W = 10.
b(X,Z,W) :- a(X,Y,W).
Y  = Y1 :- b(X,Y,W),  b(X,Y1,W1).
W  = W1 :- b(X,Y,W),  b(X,Y1,W1).
f(X,Y,Z) :- b(X,Y,Z).
@output("f").
`, 'Warded',
        []);  
  });

  test("should check harmless EGDs only in TGDs", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `p(1).s(1).
h(Z,X) :- s(X).
g(X,Z) :- p(X).
h(Z,X) :- g(X,Z).
h(X,Y) :- h(X,Z).
q(Y)   :- g(X,Y).
Z = X  :- g(X,Z), h(Z,X).
@output("h").
`, 'Warded',
        []);  
  });

});