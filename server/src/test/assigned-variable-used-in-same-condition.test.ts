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

    let receivedDiagnostics = datalogpmDocument.diagnostics.map((diagnostic) => {
      const { relatedInformation, ...rest } = diagnostic;
      return rest;
    });
    if (filterHints) {
      receivedDiagnostics = receivedDiagnostics.filter((diagnostic) =>
        diagnostic.severity !== DiagnosticSeverity.Hint
      );
    }

    assert.deepEqual(receivedDiagnostics, expectedDiagnostics);
  }
}

suite("Assigned variable used in same condition", async () => {
  test("should not report errors if variable is not assigned in condition", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `case("Case", 1).
caseName(Name) :- case(Name, W1), W = Name + (7 + (W1 + 3)).
@output("caseName").
`,
      []
    );
  });

  test("should not report errors if variable is assigned in different condition", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `case("Case", 1).
caseName(Name) :- case(Name, _), W1 = 1, W = Name + (7 + (W1 + 3)).
@output("caseName").
`,
      []
    );
  });

// Disabled test case since this check has been implemented with condition variables 
// cycle detection (condition-variables.test.ts)
// 
//  test("should report errors if variable is used in same condition as assigned", async () => {
//     const definitionProviderTest = Container.get(DiagnosticsTest);
//     await definitionProviderTest.expectDiagnostics(
//       `case("Case", 1).
// caseName(Name) :- case(Name, _), W = Name + (7 + (W + 3)).
// @output("caseName").
// `,
//     [
//       {
//         code: ErrorTypes.ERR_VARIABLE_USED_IN_SAME_CONDITION_AS_ASSIGNED,
//         codeDescription: {
//         href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_USED_IN_SAME_CONDITION_AS_ASSIGNED}`
//         },
//         message: "Variable is used in the same condition where it is assigned.",
//         range: {
//         end: {
//           character: 34,
//           line: 1
//         },
//         start: {
//           character: 33,
//           line: 1
//         }
//         },
//         severity: 1,
//         tags: []
//       },
//       {
//         code: ErrorTypes.ERR_VARIABLE_USED_IN_SAME_CONDITION_AS_ASSIGNED,
//         codeDescription: {
//           href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_VARIABLE_USED_IN_SAME_CONDITION_AS_ASSIGNED}`
//         },
//         message: "Variable is used in the same condition where it is assigned.",
//         range: {
//         end: {
//           character: 51,
//           line: 1
//         },
//         start: {
//           character: 50,
//           line: 1
//         }
//         },
//         severity: 1,
//         tags: []
//       }
//       ]
//     );
//  });

});

