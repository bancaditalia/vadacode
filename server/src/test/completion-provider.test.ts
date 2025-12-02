// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Completion provider test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import { Position, TextDocument } from "vscode-languageserver-textdocument";
import {
  CompletionItem
} from "vscode-languageserver/node";
import { CompletionProviderService } from "../completion-provider.service";
import { DocumentManagerService } from "../document-manager.service";

@Service()
export class CompletionProviderTest {
  constructor(
    public completionProviderService: CompletionProviderService,
    public documentManagerService: DocumentManagerService
  ) {}

  async expectCompletionItems(
    content: string,
    position: Position,
    expectedCompletionItems: CompletionItem[]
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

    const receivedCompletionItems =
      await this.completionProviderService.provideCompletionItems(
        datalogpmDocument,
        position
      );

    assert.deepEqual(receivedCompletionItems, expectedCompletionItems);
  }
}

suite("CompletionProviderService", () => {
  test("should not show completions for non existing atoms", async () => {
    const completionTest = Container.get(CompletionProviderTest);
    await completionTest.expectCompletionItems(
      "hello(1).\nb",
      { line: 1, character: 1 },
      []
    );
  });

  test("should show completions for existing atoms", async () => {
    const completionTest = Container.get(CompletionProviderTest);
    await completionTest.expectCompletionItems(
      "hello(1).\nh",
      { line: 1, character: 1 },
      [
        {
          label: "hello",
          detail: "atom",
          kind: 6,
          commitCharacters: ["("],
          insertText: "hello(",
        },
      ]
    );
  });

  test("should not show completions for non-existing annotations", async () => {
    const completionTest = Container.get(CompletionProviderTest);
    await completionTest.expectCompletionItems(
      "hello(1).\n@x",
      { line: 1, character: 2 },
      []
    );
  });

  test("should show completions for existing annotations", async () => {
    const completionTest = Container.get(CompletionProviderTest);
    await completionTest.expectCompletionItems(
      "hello(1).\n@bi",
      { line: 1, character: 3 },
      [
        {
          label: "@bind",
          labelDetails: {
            detail:
              '("atomName", "data source", "outermost container", "innermost container")',
          },
          detail: "annotation",
          kind: 14,
          insertText: "@bind",
          command: {
            command: "editor.action.triggerSuggest",
            title: "Re-trigger completions...",
          },
        },
      ]
    );
  });

  test("should show completions for multiple existing atoms", async () => {
    const completionTest = Container.get(CompletionProviderTest);
    await completionTest.expectCompletionItems(
      "hello(1).\nhi(2).\nh",
      { line: 2, character: 1 },
      [
        {
          label: "hello",
          detail: "atom",
          kind: 6,
          commitCharacters: ["("],
          insertText: "hello(",
        },
        {
          commitCharacters: ["("],
          detail: "atom",
          insertText: "hi(",
          kind: 6,
          label: "hi",
        },
      ]
    );
  });
});
