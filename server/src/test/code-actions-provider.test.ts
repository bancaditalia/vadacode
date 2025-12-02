// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Code actions provider test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import {
  CodeAction,
  CodeActionKind,
  DiagnosticSeverity
} from "vscode-languageserver";
import { Position, TextDocument } from "vscode-languageserver-textdocument";
import { CodeActionsProviderService } from "../code-actions-provider.service";
import { ErrorTypes } from "../datalogpm/diagnostic-messages";
import { DatalogpmDocument } from "../datalogpm/datalogpm-document";

const DOC_URI = "test://test/test.vada";

@Service()
export class CodeActionsProviderTest {
  constructor(public codeActionsProviderService: CodeActionsProviderService) {}

  async expectCodeActions(
    content: string,
    position: Position,
    expectedCodeActions: CodeAction[]
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument);

    const receivedCodeActions =
      await this.codeActionsProviderService.provideCodeActions(
        datalogpmDocument,
        {
          diagnostics: [
            {
              code: ErrorTypes.ERR_UNUSED_ATOM,
              codeDescription: {
                "href": `https://www.vadalog.org/vadacode-manual/latest/diagnostic-codes.html#${ErrorTypes.ERR_UNUSED_ATOM}`
              },             
              message: "Unused",
              range: {
                start: position,
                end: {
                  line: position.line,
                  character: position.character + 10,
                },
              },
              severity: DiagnosticSeverity.Warning,
              source: "",
              tags: [],
            },
          ],
        },
        {
          start: position,
          end: position,
        }
      );

    assert.deepEqual(receivedCodeActions, expectedCodeActions);
  }
}

suite("CodeActionsProviderTest", () => {
  test("should provide actions for unbound @output", async () => {
    const definitionProviderTest = Container.get(CodeActionsProviderTest);
    await definitionProviderTest.expectCodeActions(
      `% Implicit definition of atom owns
@input("owns").

% Use of atom owns
iowns(X, Y, Q) :- owns(X, Y, Q1), owns(Y, Z, Q2), Q=Q1*Q2.
`,
      {
        line: 4,
        character: 0,
      },
      [
        {
          title: "Add @exports tag",
          kind: CodeActionKind.QuickFix,
          edit: {
            changes: {
              "test://test/test.vada": [
                {
                  range: {
                    start: {
                      line: 4,
                      character: 0,
                    },
                    end: {
                      line: 4,
                      character: 5,
                    },
                  },
                  newText: "%% @exports iowns\niowns",
                },
              ],
            },
          },
        },
        {
          title: 'Remove generating rule of atom "iowns"',
          kind: CodeActionKind.QuickFix,
          edit: {
            changes: {
              "test://test/test.vada": [
                {
                  range: {
                    start: {
                      line: 4,
                      character: 0,
                    },
                    end: {
                      line: 4,
                      character: 58,
                    },
                  },
                  newText: "",
                },
              ],
            },
          },
        },
        {
          "edit": {
            "changes": {
              "test://test/test.vada": [
                {
                  "newText": "@output(\"iowns\").\niowns",
                  "range": {
                    "end": {
                      "character": 5,
                      "line": 4
                    },
                    "start": {
                      "character": 0,
                      "line": 4
                    }
                  }
                }
              ]
            }
          },
          "kind": CodeActionKind.QuickFix,
          "title": "Add @output tag"
        }        
      ]
    );
  });

  test("should not provide actions for bound @output", async () => {
    const definitionProviderTest = Container.get(CodeActionsProviderTest);
    await definitionProviderTest.expectCodeActions(
      `% Implicit definition of atom owns
@input("owns").

% Use of atom owns
iowns(X, Y, Q) :- owns(X, Y, Q1), owns(Y, Z, Q2), Q=Q1*Q2.
@output("iowns").
`,
      {
        line: 4,
        character: 0,
      },
      [
        {
          title: "Add @exports tag",
          kind: CodeActionKind.QuickFix,
          edit: {
            changes: {
              "test://test/test.vada": [
                {
                  range: {
                    start: {
                      line: 4,
                      character: 0,
                    },
                    end: {
                      line: 4,
                      character: 5,
                    },
                  },
                  newText: "%% @exports iowns\niowns",
                },
              ],
            },
          },
        },
        {
          title: 'Remove generating rule of atom "iowns"',
          kind: CodeActionKind.QuickFix,
          edit: {
            changes: {
              "test://test/test.vada": [
                {
                  range: {
                    start: {
                      line: 4,
                      character: 0,
                    },
                    end: {
                      line: 4,
                      character: 58,
                    },
                  },
                  newText: "",
                },
              ],
            },
          },
        },
        {
          "edit": {
            "changes": {
              "test://test/test.vada": [
                {
                  "newText": "@output(\"iowns\").\niowns",
                  "range": {
                    "end": {
                      "character": 5,
                      "line": 4
                    },
                    "start": {
                      "character": 0,
                      "line": 4
                    }
                  }
                }
              ]
            }
          },
          "kind": CodeActionKind.QuickFix,
          "title": "Add @output tag"
        }        
      ]
    );
  });

});
