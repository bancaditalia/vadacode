// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Smoke test for Vadacode diagnostics.
 */

import {
  BottomBarPanel,
  EditorView,
  InputBox,
  MarkerType,
  TextEditor,
  Workbench
} from "vscode-extension-tester";

import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
describe("Diagnostics", () => {
  let editor: TextEditor;

  before(async () => {
    await new EditorView().closeAllEditors();
    // We need to open some modal dialog first, so let's try to close an unsaved file
    // Create a new file
    await new Workbench().executeCommand("create new file");
    const input = await InputBox.create();
    await input.selectQuickPick("Text File");
    await new Promise((res) => {
      setTimeout(res, 1000);
    });
    const filePath = path.resolve(__dirname, "vadacode-test-file.vada");
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      // Do nothing
    }

    // Make some changes
    editor = new TextEditor();
    const prompt = await editor.saveAs();
    await prompt.setText(filePath);
    await prompt.confirm();
  });

  after(async function () {
    this.timeout(10_000);
    // Cleanup, delete the file contents and close the editor
    const editor = (await new EditorView().openEditor(
      "vadacode-test-file.vada"
    )) as TextEditor;
    await editor.clearText();
    await editor.save();
    await new EditorView().closeAllEditors();
  });

  // Now we can check what the dialog says
  it("Should produce no errors on a correct program", async () => {
    // Look up an open editor by name to avoid stale element reference exception
    await timeout(1_000);
    const editor = (await new EditorView().openEditor(
      "vadacode-test-file.vada"
    )) as TextEditor;
    await timeout(1_000);
    await editor.typeTextAt(1, 1, `a(1).
b(X):- a(X).
@output("b").`);
    await timeout(500);
    // Save file to avoid Save prompt
    await editor.save();

    const bottomBar = new BottomBarPanel();
    const problemsView = await bottomBar.openProblemsView();

    await timeout(500);
    const errors = await problemsView.getAllVisibleMarkers(MarkerType.Error);
    assert.ok(errors.length === 0);
  });

  // Now we can check what the dialog says
  it("Should produce errors on bad programs", async () => {
    // Look up an open editor by name to avoid stale element reference exception
    const editor = (await new EditorView().openEditor(
      "vadacode-test-file.vada"
    )) as TextEditor;
    await editor.clearText();
    await editor.typeTextAt(1, 1, `a(--1).
b(X):- a(X).
@output("b").`);
    await timeout(500);
    // Save file to avoid Save prompt
    await editor.save();

    const bottomBar = new BottomBarPanel();
    const problemsView = await bottomBar.openProblemsView();

    await timeout(500);
    const errors = await problemsView.getAllVisibleMarkers(MarkerType.Error);
    assert.ok(errors.length > 0);
  });

});
