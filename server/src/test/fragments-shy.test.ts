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
import Container, { Service } from "typedi";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DatalogpmDocument } from "../datalogpm/datalogpm-document";
import { ErrorTypes } from "../datalogpm/diagnostic-messages";
import { Fragment } from 'server/src/isomorphic';

const DOC_URI = "test://test/test.vada";

@Service()
export class DiagnosticsTest {
  async expectDiagnostics(
    content: string,
    fragment: Fragment,
    expectedDiagnostics: Diagnostic[],
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument, fragment);

    const receivedDiagnostics = datalogpmDocument.diagnostics.map((diagnostic) => {
      const { relatedInformation, ...rest } = diagnostic;
      return rest;
    });
    const nonHintReceivedDiagnostics = receivedDiagnostics.filter((diagnostic: Diagnostic) => diagnostic.severity === DiagnosticSeverity.Error);

    assert.deepEqual(nonHintReceivedDiagnostics, expectedDiagnostics);
  }
}

suite("Shy diagnostics", () => {

  test("should not report diagnostics for a Shy program (guarded)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% Shy
human("andrea").
person(X) :- human(X).
human2(X,Y) :- person(X), human(X).
@output("human2").
`, 'Shy',
      []
    );
  });

  test("should report diagnostics for a non-Shy program (violation of S1 condition)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% Warded, not shy (violates S1)
e("a").
i1(X,Y) :- e(X).
i2(X,Z) :- i1(X,Y), i1(Z,Y).
@output("i2").
`, 'Shy',
      [
        {
          code: ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S1_CONDITION,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S1_CONDITION}`
          },
          message:
            "Rule is not Shy: Variable 'Y' occurs in more than one body atom and is not protected in the body of the rule.",
          range: {
            end: {
              character: 17,
              line: 3,
            },
            start: {
              character: 16,
              line: 3,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Shy"
          }          
        },
        {
          code: ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S1_CONDITION,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S1_CONDITION}`
          },
          message:
            "Rule is not Shy: Variable 'Y' occurs in more than one body atom and is not protected in the body of the rule.",
          range: {
            end: {
              character: 26,
              line: 3,
            },
            start: {
              character: 25,
              line: 3,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Shy"
          }          
        },
      ]
    );
  });

  test("should report diagnostics for a non-Shy program (violation of S2 condition)", async () => {
    const definitionProviderTest = Container.get(DiagnosticsTest);
    await definitionProviderTest.expectDiagnostics(
      `% Not shy (violates S2)
e("a").
f("a").
i1(X,Y) :- e(X).
i2(M,N) :- i1(M,N).
i3(Y,Z) :- i1(X,Y), i2(X,Z).
@output("i2").
`, 'Shy',
      [
        {
          code: ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S2_CONDITION,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S2_CONDITION}`
          },
          message:
            "Rule is not Shy: Two distinct ∀-variables, that are not protected in the body of the rule and occur both in head and in two different body atoms, are attacked by the same invading variable.",
          range: {
            end: {
              character: 4,
              line: 5,
            },
            start: {
              character: 3,
              line: 5,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Shy"
          }          
        },
        {
          code: ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S2_CONDITION,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S2_CONDITION}`
          },
          message:
            "Rule is not Shy: Two distinct ∀-variables, that are not protected in the body of the rule and occur both in head and in two different body atoms, are attacked by the same invading variable.",
          range: {
            end: {
              character: 17,
              line: 5,
            },
            start: {
              character: 16,
              line: 5,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Shy"
          }          
        },
        {
          code: ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S2_CONDITION,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S2_CONDITION}`
          },
          message:
            "Rule is not Shy: Two distinct ∀-variables, that are not protected in the body of the rule and occur both in head and in two different body atoms, are attacked by the same invading variable.",
          range: {
            end: {
              character: 6,
              line: 5,
            },
            start: {
              character: 5,
              line: 5,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Shy"
          }          
        },
        {
          code: ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S2_CONDITION,
          codeDescription: {
            href: `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_ATOM_NOT_VIOLATING_SHY_S2_CONDITION}`
          },
          message:
            "Rule is not Shy: Two distinct ∀-variables, that are not protected in the body of the rule and occur both in head and in two different body atoms, are attacked by the same invading variable.",
          range: {
            end: {
              character: 26,
              line: 5,
            },
            start: {
              character: 25,
              line: 5,
            },
          },
          severity: DiagnosticSeverity.Error,
          tags: [],
          data: {
            fragmentViolation: "Shy"
          }          
        },
      ]
    );
  });

});