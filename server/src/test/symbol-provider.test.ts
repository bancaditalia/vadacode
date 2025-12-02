// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Symbol provider test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import {
  DocumentSymbol,
  SymbolKind
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { SymbolProviderService } from '../symbol-provider.service';
import { DatalogpmDocument } from "../datalogpm/datalogpm-document";

const DOC_URI = "test://test/test.vada";

@Service()
export class SymbolProviderTest {
  constructor(public symbolProviderService: SymbolProviderService) {}

  async expectSymbolsDefinitions(
    content: string,
    expectedSymbols: DocumentSymbol[]
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument);

    const receivedSymbols =
      await this.symbolProviderService.provideDocumentSymbols(
        datalogpmDocument
      );

    assert.deepEqual(receivedSymbols, expectedSymbols);
  }
}


suite("SymbolProviderTest", () => {
  test("should not provide any symbol for an empty program", async () => {
    const definitionProviderTest = Container.get(SymbolProviderTest);
    await definitionProviderTest.expectSymbolsDefinitions(
      ``,
      [],
    );
  });


  test("should provide a single symbol even in case multiple facts", async () => {
    const definitionProviderTest = Container.get(SymbolProviderTest);
    await definitionProviderTest.expectSymbolsDefinitions(
      `a(1).a(2).a(3).`,
      [
        {
          detail: 'atom',
          kind: SymbolKind.Function,
          name: 'a',
          range: {
            end: {
              character: 1,
              line: 0
            },
            start: {
              character: 0,
              line: 0
            }
          },
          selectionRange: {
            end: {
              character: 1,
              line: 0
            },
            start: {
              character: 0,
              line: 0
            }
          },
          children: [
              {
                children: [],
                detail: "term",
                kind: SymbolKind.Variable,
                name: "Term1",
                range: {
                  end: {
                    character: 3,
                    line: 0
                  },
                  start: {
                    character: 2,
                    line: 0
                  }
                },
                selectionRange: {
                  end: {
                    character: 3,
                    line: 0
                  },
                  start: {
                    character: 2,
                    line: 0
                  }
                }
              }
            ]          
        }
      ]
    );
  });

  test("should provide multiple symbols for multiple different facts", async () => {
    const definitionProviderTest = Container.get(SymbolProviderTest);
    await definitionProviderTest.expectSymbolsDefinitions(
      `a(1).a(2).b(3).`,
      [
        {
          detail: 'atom',
          kind: SymbolKind.Function,
          name: 'a',
          range: {
            end: {
              character: 1,
              line: 0
            },
            start: {
              character: 0,
              line: 0
            }
          },
          selectionRange: {
            end: {
              character: 1,
              line: 0
            },
            start: {
              character: 0,
              line: 0
            }
          },
          children: [
            {
              children: [],
              detail: "term",
              kind: SymbolKind.Variable,
              name: "Term1",
              range: {
                end: {
                  character: 3,
                  line: 0
                },
                start: {
                  character: 2,
                  line: 0
                }
              },
              selectionRange: {
                end: {
                  character: 3,
                  line: 0
                },
                start: {
                  character: 2,
                  line: 0
                }
              }
            }
          ]          
        },
        {
          detail: 'atom',
          kind: SymbolKind.Function,
          name: 'b',
          range: {
            end: {
              character: 11,
              line: 0
            },
            start: {
              character: 10,
              line: 0
            }
          },
          selectionRange: {
            end: {
              character: 11,
              line: 0
            },
            start: {
              character: 10,
              line: 0
            }
          },
          children: [
            {
              children: [],
              detail: "term",
              kind: SymbolKind.Variable,
              name: "Term1",
              range: {
                end: {
                  character: 13,
                  line: 0
                },
                start: {
                  character: 12,
                  line: 0
                }
              },
              selectionRange: {
                end: {
                  character: 13,
                  line: 0
                },
                start: {
                  character: 12,
                  line: 0
                }
              }
            }
          ]          
        }
      ]
    );
  });


  test("should provide unquoted symbols even in case of annotations only", async () => {
    const definitionProviderTest = Container.get(SymbolProviderTest);
    await definitionProviderTest.expectSymbolsDefinitions(
      `@input("someInputData").
@bind("someInputData", "csv useHeaders=true", "/samples", "input.csv").`,
      [
        {
          "detail": "atom",
          "kind": SymbolKind.Function,
          "name": "someInputData",
          "range": {
            "end": {
              "character": 22,
              "line": 0
            },
            "start": {
              "character": 7,
              "line": 0
            }
          },
          "selectionRange": {
            "end": {
              "character": 22,
              "line": 0
            },
            "start": {
              "character": 7,
              "line": 0
            }
          },
          "children": []
        }
      ]
    );
  });
});
