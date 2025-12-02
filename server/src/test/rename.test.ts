// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Rename provider test.
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import * as assert from "assert";
import Container, { Service } from "typedi";
import { Position, TextDocument } from "vscode-languageserver-textdocument";
import { WorkspaceEdit } from "vscode-languageserver/node";
import { RenameEditsService } from "../rename-edits.service";
import { DatalogpmDocument } from "../datalogpm/datalogpm-document";

@Service()
export class RenameProviderTest {
  constructor(public renameEditsService: RenameEditsService) {}

  async testRename(
    content: string,
    position: Position,
    newName: string,
    expectedDocContent: string
  ): Promise<void> {
    const textDocument = TextDocument.create(
      "test://test/test.vada",
      "datalogpm",
      0,
      content
    );
    const datalogpmDocument = new DatalogpmDocument(textDocument);

    const workspaceEdit: WorkspaceEdit | undefined =
      await this.renameEditsService.provideRenameEdits(
        datalogpmDocument,
        position,
        newName
      );

    if (!workspaceEdit || !workspaceEdit.changes) {
      assert.fail("No workspace edits");
    }

    const edits = workspaceEdit.changes[textDocument.uri.toString()];
    if (!edits) {
      assert.fail(`No edits for file at ${textDocument.uri.toString()}`);
    }

    const newDocContent = TextDocument.applyEdits(textDocument, edits);

    assert.strictEqual(
      newDocContent,
      expectedDocContent,
      `Expected: ${expectedDocContent}\nActual: ${newDocContent}`
    );
  }

  async testNoEdits(content: string, position: Position): Promise<void> {
    const textDocument = TextDocument.create(
      "test://test/test.vada",
      "datalogpm",
      0,
      content
    );
    const datalogpmDocument = new DatalogpmDocument(textDocument);

    const workspaceEdit: WorkspaceEdit | undefined =
      await this.renameEditsService.provideRenameEdits(
        datalogpmDocument,
        position,
        "..."
      );

    assert.ok(
      !workspaceEdit ||
        !workspaceEdit.changes ||
        Object.keys(workspaceEdit.changes).length === 0,
      "No workspace edits"
    );
  }
}

suite("RenameEditsService", () => {
  test("must rename a single atom", async () => {
    const renameTest = Container.get(RenameProviderTest);
    await renameTest.testRename(
      "a(1).",
      { line: 0, character: 0 },
      "b",
      "b(1)."
    );
  });

  test("must rename a single atom among others", async () => {
    const renameTest = Container.get(RenameProviderTest);
    await renameTest.testRename(
      "a(1).b(2).c(3).",
      { line: 0, character: 5 },
      "z",
      "a(1).z(2).c(3)."
    );
  });

  test("must rename all instances of an atom in the program", async () => {
    const renameTest = Container.get(RenameProviderTest);
    await renameTest.testRename(
      "a(1).b(2).c(3).\nd(X) :- a(X).\ne(X) :- c(X).\ne(X) :- c(X).\nf(X,Y) :- c(X),c(Y).",
      { line: 0, character: 10 },
      "z",
      "a(1).b(2).z(3).\nd(X) :- a(X).\ne(X) :- z(X).\ne(X) :- z(X).\nf(X,Y) :- z(X),z(Y)."
    );
  });

  test("must rename multiple instances of an atom in the same body", async () => {
    const renameTest = Container.get(RenameProviderTest);
    await renameTest.testRename(
      "f(X,Y) :- c(X),c(Y).",
      { line: 0, character: 10 },
      "z",
      "f(X,Y) :- z(X),z(Y)."
    );
  });

  test("must not rename if no edit exist at position", async () => {
    const renameTest = Container.get(RenameProviderTest);
    await renameTest.testNoEdits("f(X,Y) :- c(X),c(Y).", {
      line: 0,
      character: 6,
    });
  });

  test("must rename multiple instances of an atom even among rules and inputs, from @input argument", async () => {
    const renameTest = Container.get(RenameProviderTest);
    await renameTest.testRename(
      `@input("t1").
t4(X) :- t1(X).
@output("t4").

`,
      { line: 0, character: 9 },
      "hello",
      `@input("hello").
t4(X) :- hello(X).
@output("t4").

`
    );
  });

  test("must rename multiple instances of an atom even among rules and inputs, from rule", async () => {
    const renameTest = Container.get(RenameProviderTest);
    await renameTest.testRename(
      `@input("t1").
t4(X) :- t1(X).
@output("t4").
`,
      { line: 1, character: 10 },
      "hello",
      `@input("hello").
t4(X) :- hello(X).
@output("t4").
`
    );
  });

  test("must rename multiple instances of an atom even among rules and outputs, from @output annotation", async () => {
    const renameTest = Container.get(RenameProviderTest);
    await renameTest.testRename(
      `t1(1).
t4(X) :- t1(X).
@output("t4").
@output("t1").
`,
      { line: 2, character: 10 },
      "hello",
      `t1(1).
hello(X) :- t1(X).
@output("hello").
@output("t1").
`
    );
  });

  test("must rename multiple instances of an atom even among rules and outputs, from rule", async () => {
    const renameTest = Container.get(RenameProviderTest);
    await renameTest.testRename(
      `t1(1).
t4(X) :- t1(X).
@output("t4").
@output("t1").
`,
      { line: 1, character: 1 },
      "hello",
      `t1(1).
hello(X) :- t1(X).
@output("hello").
@output("t1").
`
    );
  });

  test("must rename multiple instances of an atom even among rules and outputs", async () => {
    const renameTest = Container.get(RenameProviderTest);
    await renameTest.testRename(
      `t1(1).
t4(X) :- t1(X).
@output("t4").
@output("t1").
`,
      { line: 3, character: 10 },
      "hello",
      `hello(1).
t4(X) :- hello(X).
@output("t4").
@output("hello").
`
    );
  });

  test("must rename a single variable", async () => {
    const renameTest = Container.get(RenameProviderTest);
    await renameTest.testRename(
      `@input("t1").
t4(X) :- t1(X).
@output("t4").
`,
      { line: 1, character: 12 },
      "Hello",
      `@input("t1").
t4(Hello) :- t1(Hello).
@output("t4").
`
    );

  });

  test("must rename multiple variables in the same rule", async () => {
    const renameTest = Container.get(RenameProviderTest);
    await renameTest.testRename(
      `@input("t1").
t4(X, X, X) :- t1(X).
@output("t4").
`,
      { line: 1, character: 6 },
      "Hello",
      `@input("t1").
t4(Hello, Hello, Hello) :- t1(Hello).
@output("t4").
`
    );

  });

  test("must not rename non-renamed variables", async () => {
    const renameTest = Container.get(RenameProviderTest);
    await renameTest.testRename(
      `@input("t1").
t4(A, B, C) :- t1(B).
@output("t4").
`,
      { line: 1, character: 6 },
      "Hello",
      `@input("t1").
t4(A, Hello, C) :- t1(Hello).
@output("t4").
`
    );

  });


  test("must not rename variables in other rules", async () => {
    const renameTest = Container.get(RenameProviderTest);
    await renameTest.testRename(
      `@input("t1").
t4(X, X, X) :- t1(X).
t5(X, X, X) :- t4(X, X, X).
@output("t5").
`,
      { line: 1, character: 6 },
      "Hello",
      `@input("t1").
t4(Hello, Hello, Hello) :- t1(Hello).
t5(X, X, X) :- t4(X, X, X).
@output("t5").
`
    );

  });
});
