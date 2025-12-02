// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Semantic tokens provider test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  SemanticTokensBuilder
} from "vscode-languageserver/node";
import { DocumentManagerService } from "../document-manager.service";
import { RenameEditsService } from "../rename-edits.service";
import {
  IParsedToken,
  tokenModifiers,
  tokenTypes,
} from "../semantic-provider.service";

// Derived from microsoft sample
function provideDocumentSemanticTokens(tokens: IParsedToken[]) {
  const builder = new SemanticTokensBuilder();
  tokens.forEach((token) => {
    builder.push(
      token.line,
      token.startCharacter,
      token.length,
      _encodeTokenType(token.tokenType),
      _encodeTokenModifiers(token.tokenModifiers)
    );
  });
  return builder.build();
}

// Derived from microsoft sample
function _encodeTokenType(tokenType: string): number {
  if (tokenTypes.has(tokenType)) {
    return tokenTypes.get(tokenType)!;
  } else if (tokenType === "notInLegend") {
    return tokenTypes.size + 2;
  }
  return 0;
}

// Derived from microsoft sample
function _encodeTokenModifiers(strTokenModifiers: string[]): number {
  let result = 0;
  for (let i = 0; i < strTokenModifiers.length; i++) {
    const tokenModifier = strTokenModifiers[i];
    if (tokenModifiers.has(tokenModifier)) {
      result = result | (1 << tokenModifiers.get(tokenModifier)!);
    } else if (tokenModifier === "notInLegend") {
      result = result | (1 << (tokenModifiers.size + 2));
    }
  }
  return result;
}

@Service()
export class SemanticProviderTest {
  constructor(
    public renameEditsService: RenameEditsService,
    public documentManagerService: DocumentManagerService
  ) {}

  async expectSemanticTokens(
    content: string,
    expectedTokens: IParsedToken[]
  ): Promise<void> {
    const textDocument = TextDocument.create(
      "test://test/test.vada",
      "datalogpm",
      0,
      content
    );

    const datalogpmDocument = this.documentManagerService.setContents(
      textDocument.uri,
      textDocument
    );

    const semanticTokens =
      this.documentManagerService.provideDocumentSemanticTokens(
        datalogpmDocument.document.uri
      );

    assert.deepEqual(
      semanticTokens.data,
      provideDocumentSemanticTokens(expectedTokens).data
    );
  }
}

suite("DocumentManagerService", () => {
  test("should show ground atoms as static functions", async () => {
    const renameTest = Container.get(SemanticProviderTest);
    await renameTest.expectSemanticTokens("a(1).", [
      {
        line: 0,
        startCharacter: 0,
        length: 1,
        tokenType: "function",
        tokenModifiers: ["static"],
      },
      {
        line: 0,
        startCharacter: 2,
        length: 1,
        tokenType: "number",
        tokenModifiers: [],
      },
      {
        line: 0,
        startCharacter: 4,
        length: 1,
        tokenType: "operator",
        tokenModifiers: [],
      },
    ]);
  });

  test("should show bound terms as non-static functions", async () => {
    const renameTest = Container.get(SemanticProviderTest);
    await renameTest.expectSemanticTokens("a(X):-b(X).", [
      {
        line: 0,
        startCharacter: 0,
        length: 1,
        tokenType: "function",
        tokenModifiers: [],
      },
      {
        line: 0,
        startCharacter: 2,
        length: 1,
        tokenType: "variable",
        tokenModifiers: [],
      },
      {
        line: 0,
        startCharacter: 4,
        length: 2,
        tokenType: "operator",
        tokenModifiers: [],
      },
      {
        line: 0,
        startCharacter: 6,
        length: 1,
        tokenType: "function",
        tokenModifiers: [],
      },
      {
        line: 0,
        startCharacter: 8,
        length: 1,
        tokenType: "variable",
        tokenModifiers: [],
      },
      {
        line: 0,
        startCharacter: 10,
        length: 1,
        tokenType: "operator",
        tokenModifiers: [],
      },
    ]);
  });

  test("should allow spaces", async () => {
    const renameTest = Container.get(SemanticProviderTest);
    await renameTest.expectSemanticTokens("a(X) :- b(X).", [
      {
        line: 0,
        startCharacter: 0,
        length: 1,
        tokenType: "function",
        tokenModifiers: [],
      },
      {
        line: 0,
        startCharacter: 2,
        length: 1,
        tokenType: "variable",
        tokenModifiers: [],
      },

      {
        line: 0,
        startCharacter: 5,
        length: 2,
        tokenType: "operator",
        tokenModifiers: [],
      },
      {
        line: 0,
        startCharacter: 8,
        length: 1,
        tokenType: "function",
        tokenModifiers: [],
      },
      {
        line: 0,
        startCharacter: 10,
        length: 1,
        tokenType: "variable",
        tokenModifiers: [],
      },
      {
        line: 0,
        startCharacter: 12,
        length: 1,
        tokenType: "operator",
        tokenModifiers: [],
      },
    ]);
  });

  test("should show strings", async () => {
    const renameTest = Container.get(SemanticProviderTest);
    await renameTest.expectSemanticTokens('a("X").', [
      {
        line: 0,
        startCharacter: 0,
        length: 1,
        tokenType: "function",
        tokenModifiers: ["static"],
      },
      {
        line: 0,
        startCharacter: 2,
        length: 3,
        tokenType: "string",
        tokenModifiers: [],
      },
      {
        line: 0,
        startCharacter: 6,
        length: 1,
        tokenType: "operator",
        tokenModifiers: [],
      },
    ]);
  });

});
