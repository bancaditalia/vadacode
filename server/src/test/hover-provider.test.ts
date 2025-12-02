// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Hint provider test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import {
  Hover
} from "vscode-languageserver";
import { Position, TextDocument } from "vscode-languageserver-textdocument";
import { HoverProviderService } from "../hover-provider.service";
import { DatalogpmDocument } from "../datalogpm/datalogpm-document";

const DOC_URI = "test://test/test.vada";

@Service()
export class HoverProviderTest {
  constructor(public hoverProviderService: HoverProviderService) {}

  async expectHover(
    content: string,
    position: Position,
    expectedHover: Hover
  ): Promise<void> {
    // Prepare document and make it available to documentManagerService
    const textDocument = TextDocument.create(DOC_URI, "datalogpm", 0, content);

    const datalogpmDocument = new DatalogpmDocument(textDocument);

    const receivedHover =
      await this.hoverProviderService.provideHoverInformation(
        datalogpmDocument,
        position
      );

    assert.deepEqual(receivedHover, expectedHover);
  }
}

suite("HoverProviderTest", () => {
  test("should consider a single appearance as a single reference", async () => {
    const definitionProviderTest = Container.get(HoverProviderTest);
    await definitionProviderTest.expectHover(
      `% KeyPerson(x, p) → PSC(x, p)
% Company (x) → ∃p PSC(x, p)
% Control(y, x), PSC(y, f) → PSC(x, f)
% PSC(x, f), PSC(v, f), x > y → StrongLink(x, y)

@input("keyPerson").
@input("company").
@input("control").

psc(X, P) :- keyPerson(X, P).
psc(X, P) :- company (X).
psc(X, P) :- control(Y, X), psc(Y, P).
strongLink(X, Y) :- psc(X, P), psc(Y, P), X > Y.

@output("psc").
@output("strongLink").
`,
      {
        line: 10,
        character: 7,
      },
      {
        contents: {
          kind: "markdown",
          value:
            "```datalogpm\n" +
            "(variable) P\n" +
            "```" + "\n\n" +
            "∃-variable (P is existentially quantified because it appears in the head but it's not bound in the body)\n\nVariable is in a position which contains marked nulls."
        },
      }
    );
  });

  test("should show annotation documentation", async () => {
    const definitionProviderTest = Container.get(HoverProviderTest);
    await definitionProviderTest.expectHover(
      `@relaxedSafety.`,
      {
        line: 0,
        character: 5,
      },
      {
        contents: {
          kind: "markdown",
          value:
            "```datalogpm\n(annotation) @relaxedSafety. \n```\n\nEnables a mode of operation that accepts programs which may not be safe in general."
        },
      }
    );
  });

  test("should richly document the program (atom)", async () => {
    const definitionProviderTest = Container.get(HoverProviderTest);
    await definitionProviderTest.expectHover(
      `% Warded, not shy (violates S1)
e("a").
i1(X,Y) :- e(X).
i1(X,M) :- e(X).
i2(X,Z) :- i1(X,Y), i1(Z,Y).
@output("i2").
`,
      {
        line: 4,
        character: 21,
      },
      {
        contents: {
          kind: "markdown",
          value: `\`\`\`datalogpm
(atom) i1(X, Y).
\`\`\`

Terms (inferred from usage):

* \`X\`
* \`Y\`


Atom is intensional (it's defined by logic implication).



`
        },
      }
    );
  });

  test("should richly document the program (variable)", async () => {
    const definitionProviderTest = Container.get(HoverProviderTest);
    await definitionProviderTest.expectHover(
      `% Warded, not shy (violates S1)
e("a").
i1(X,Y) :- e(X).
i1(X,M) :- e(X).
i2(X,Z) :- i1(X,Y), i1(Z,Y).
@output("i2").
`,
      {
        line: 4,
        character: 25,
      },
      {
        contents: {
          kind: "markdown",
          value: `\`\`\`datalogpm
(variable) Y
\`\`\`

Variable is in a position which contains marked nulls.

Y is harmful, because it appears in an atom position which may contain nulls.

Y is attacked by variables \`Y\` at (3, 6), \`M\` at (4, 6).`
        },
      }
    );
  });

  test("should escape HTML contents (atom)", async () => {
    const definitionProviderTest = Container.get(HoverProviderTest);
    await definitionProviderTest.expectHover(
      `%% Hello <escape>.
a(1).
`,
      {
        line: 1,
        character: 0,
      },
      {
        contents: {
          kind: "markdown",
          value: `\`\`\`datalogpm\n(atom) a(Term1).\n\`\`\`\nHello &lt;escape&gt;.\n\nTerms (inferred from fact):\n\n* \`Term1\`\n\nAtom is extensional (comes either from inline facts or @input binding).\n\n\n\n\n`
        },
      }
    );
  });


  test("should escape HTML contents (atom)", async () => {
    const definitionProviderTest = Container.get(HoverProviderTest);
    await definitionProviderTest.expectHover(
      `%% Hello.
%% @term {string} Term1 <Description of Term1>. Example: Alice.
a(X) :- b(X).
`,
      {
        line: 2,
        character: 0,
      },
      {
        contents: {
          kind: "markdown",
          value: `\`\`\`datalogpm\n(atom) a(Term1).\n\`\`\`\nHello.\n\nTerms (inferred from usage):\n\n* \`Term1\`: &lt;Description of Term1&gt;. Example: Alice.\n\n\nAtom is intensional (it's defined by logic implication).\n\n\n\n`
        },
      }
    );
  });

});
