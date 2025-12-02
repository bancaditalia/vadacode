// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Reference provider test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import { Location } from "vscode-languageserver";
import { Position, TextDocument } from "vscode-languageserver-textdocument";
import { ReferenceProviderService } from "../reference-provider.service";
import { DatalogpmDocument } from "../datalogpm/datalogpm-document";

const DOC_URI = "test://test/test.vada";

@Service()
export class ReferenceProviderTest {
  constructor(public referenceProviderService: ReferenceProviderService) {}

  async expectDefinitions(
    content: string,
    position: Position,
    expectedReferenceLocations: Location[]
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument);

    const receivedReferenceLocations =
      await this.referenceProviderService.provideReferences(
        datalogpmDocument,
        {
          // Include the declaration of the current symbol.
          includeDeclaration: true,
        },
        position
      );

    assert.deepEqual(receivedReferenceLocations, expectedReferenceLocations);
  }
}

suite("ReferenceProviderTest", () => {
  test("should consider a single appearance as a single reference", async () => {
    const definitionProviderTest = Container.get(ReferenceProviderTest);
    await definitionProviderTest.expectDefinitions(
      "a(1).",
      {
        line: 0,
        character: 0,
      },
      [
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
        },
      ]
    );
  });

  test("should consider both appearances in a recursive rule, looking at the head", async () => {
    const definitionProviderTest = Container.get(ReferenceProviderTest);
    await definitionProviderTest.expectDefinitions(
      "a(X) :- a(X).",
      {
        line: 0,
        character: 0,
      },
      [
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
        },
        {
          uri: DOC_URI,
          range: {
            start: {
              line: 0,
              character: 8,
            },
            end: {
              line: 0,
              character: 9,
            },
          },
        },
      ]
    );
  });

  test("should consider both appearances in a recursive rule, looking at the body", async () => {
    const definitionProviderTest = Container.get(ReferenceProviderTest);
    await definitionProviderTest.expectDefinitions(
      "a(X) :- a(X).",
      {
        line: 0,
        character: 8,
      },
      [
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
        },
        {
          uri: DOC_URI,
          range: {
            start: {
              line: 0,
              character: 8,
            },
            end: {
              line: 0,
              character: 9,
            },
          },
        },
      ]
    );
  });

  test("should consider all appearances in a recursive rule, looking at the body", async () => {
    const definitionProviderTest = Container.get(ReferenceProviderTest);
    await definitionProviderTest.expectDefinitions(
      "a(X) :- a(X), a(X), b(X), c(X).\na(1).",
      {
        line: 0,
        character: 8,
      },
      [
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
        },
        {
          uri: DOC_URI,
          range: {
            start: {
              line: 0,
              character: 8,
            },
            end: {
              line: 0,
              character: 9,
            },
          },
        },
        {
          uri: DOC_URI,
          range: {
            start: {
              line: 0,
              character: 14,
            },
            end: {
              line: 0,
              character: 15,
            },
          },
        },
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
        },
      ]
    );
  });
});
