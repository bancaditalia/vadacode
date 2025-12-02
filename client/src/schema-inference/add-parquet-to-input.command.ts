// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Registers the "Add Parquet to Input" command.
 */

import { commands, ExtensionContext, Uri, window } from 'vscode';
import { BindingInference } from './binding-inference';
import { LANGUAGE_ID } from '../isomorphic';

export function registerAddParquetToInputCommand(context: ExtensionContext) {
		commands.registerCommand(
			"vadacode.addParquetToInput", async (fileUri: Uri) => {
    const activeEditor = window.activeTextEditor;

    if (!activeEditor) {
      window.showErrorMessage('No active editor to insert @input into.');
      return;
    } else if (activeEditor.document.languageId !== LANGUAGE_ID) {
			window.showErrorMessage('You can only add @input to a Datalog+/- program.\nOpen a .vada file or a .vadanb notebook.');
			return;
		}

		// Take basename of the fileUri and remove all non a-zA-Z0-9 characters
		const inference = new BindingInference();
		try {
			const snippet = await inference.generate(fileUri.fsPath);
			activeEditor.edit(editBuilder => {
				const position = activeEditor.selection.active;
				editBuilder.insert(position, snippet);
			});

		} catch (error) {
			window.showErrorMessage(`Error generating snippet: ${error}`);
			return;
		}


  });			
}

