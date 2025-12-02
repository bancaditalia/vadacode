// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Definition provider test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import { Location } from "vscode-languageserver";
import { Position, TextDocument } from "vscode-languageserver-textdocument";
import { DefinitionProviderService } from "../definition-provider.service";
import { DocumentManagerService } from "../document-manager.service";
import { DatalogpmDocument } from "../datalogpm/datalogpm-document";

const DOC_URI = "test://test/test.vada";

@Service()
export class DefinitionProviderTest {
  constructor(
    public definitionProviderService: DefinitionProviderService,
    public documentManagerService: DocumentManagerService
  ) {}

  async expectDefinitions(
    content: string,
    position: Position,
    expectedDefinitionLocation: Location
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument);

    const receivedDefinitionLocation =
      await this.definitionProviderService.provideDefinitionInformation(
        datalogpmDocument,
        position
      );

    assert.deepEqual(receivedDefinitionLocation, expectedDefinitionLocation);
  }
}

suite("DefinitionProviderTest", () => {
  test("should consider a single appearance as definition", async () => {
    const definitionProviderTest = Container.get(DefinitionProviderTest);
    await definitionProviderTest.expectDefinitions(
      "a(1).",
      {
        line: 0,
        character: 0,
      },
      {
        uri: DOC_URI,
        range: {
          start: {
            line: 0,
            character: 0,
          },
          end: {
            line: 0,
            character: 1,
          },
        },
      }
    );
  });

  test("should consider the first appearance as definition", async () => {
    const renameTest = Container.get(DefinitionProviderTest);
    await renameTest.expectDefinitions(
      "a(1).a(2).",
      { line: 0, character: 5 },
      {
        uri: DOC_URI,
        range: {
          start: {
            line: 0,
            character: 0,
          },
          end: {
            line: 0,
            character: 1,
          },
        },
      }
    );
  });

  test("should assimilate a double atom appearance to the first", async () => {
    const renameTest = Container.get(DefinitionProviderTest);
    await renameTest.expectDefinitions(
      "a(1).b(2).a(X).",
      { line: 0, character: 10 },
      {
        uri: DOC_URI,
        range: {
          start: {
            line: 0,
            character: 0,
          },
          end: {
            line: 0,
            character: 1,
          },
        },
      }
    );
  });

  test("should support body atoms", async () => {
    const renameTest = Container.get(DefinitionProviderTest);
    await renameTest.expectDefinitions(
      "c(3).\na(1).\nb(X):-a(X).",
      { line: 2, character: 6 },
      {
        uri: DOC_URI,
        range: {
          start: {
            line: 1,
            character: 0,
          },
          end: {
            line: 1,
            character: 1,
          },
        },
      }
    );
  });
});
