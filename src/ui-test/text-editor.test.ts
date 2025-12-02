// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Smoke test for Text Editor manipulation,
 *       just to verify that testbed is working.
 */

import {
  EditorView,
  InputBox,
  TextEditor,
  Workbench,
} from "vscode-extension-tester";

import * as assert from "assert";

describe("Text Editor sample tests", () => {
  let editor: TextEditor;

  before(async function () {
    this.timeout(10_000);
    // Create a file to open in an editor
    await new Workbench().executeCommand("Create: New File...");
    await (await InputBox.create()).selectQuickPick("Text File");
    await new Promise((res) => {
      setTimeout(res, 1000);
    });
    editor = (await new EditorView().openEditor("Untitled-1")) as TextEditor;
    // Or if the file we want is currently opened we can simply do
    // editor = new TextEditor();
  });

  after(async function () {
    this.timeout(10_000);
    // Cleanup, delete the file contents and close the editor
    await editor.clearText();
    await new EditorView().closeAllEditors();
  });

  it("Text manipulation", async () => {
    // The file is currently empty, lets write something in it
    // note the coordinates are (1, 1) for the beginning of the file
    await editor.typeTextAt(1, 1, '@input("a").');

    // Now we can check if the text is correct
    const text = await editor.getText();
    assert.equal(text, '@input("a").');

    // We can also replace all the text with whatever we want
    await editor.setText('@input("a").\nb(X) :- a(1).\n@output("b").');
    // Assert how many lines there are now
    assert.equal(await editor.getNumberOfLines(), 3);

    // Get text at the line with given number
    const line = await editor.getTextAtLine(2);
    assert.equal(line, "b(X) :- a(1).");

    // Get the line number of a search string
    const lineNum = await editor.getLineOfText("output");
    assert.equal(lineNum, 3);

    // The editor should be dirty since we haven't saved yet
    assert.equal(await editor.isDirty(), true);

    // Another way to set test case timeout, this one also works with arrow functions
  }).timeout(15000);

  it("Content Assist", async () => {
    // We have content assist at our disposal, open it
    const assist = await editor.toggleContentAssist(true);
    // toggle can return void, so we need to make sure the object is present
    if (assist) {
      // Get the items visible in the content assist
      const items = await assist.getItems();
      assert.ok(items.length | 0);

      // To select an item use
      // await assist.select('whatever is available')
    }

    // Close the assistant again
    await editor.toggleContentAssist(false);
  });
});
