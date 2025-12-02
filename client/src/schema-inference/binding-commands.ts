// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Implements binding commands for the extension.
 * The commands are exposed as inline buttons in the editor.
 */

import { commands, ExtensionContext, Position, Selection, window } from 'vscode';
import { BindingInference, DatalogpmBinding } from './binding-inference';

import { inferArrayType } from './type-inference';

/**
 * Transpose a matrix (array of equal‑length arrays).
 * Example:
 *   [[1, 2, 3],
 *    [4, 5, 6],
 *    [7, 8, 9]]
 * becomes
 *   [[1, 4, 7],
 *    [2, 5, 8],
 *    [3, 6, 9]]
 */
function transpose<T>(matrix: T[][]): T[][] {
  if (matrix.length === 0) return [];

  // matrix[0].map is called once per column
  return matrix[0].map((_, colIndex) =>
    matrix.map(row => row[colIndex])
  );
}

/**
 * Insert a snippet into the currently open file at the specified line number.
 * @param snippet Snippet to insert.
 * @param lineNumber Line number where to insert the snippet.
 */
async function insertSnippetInOpenFile(snippet: string, lineNumber: number) {
  const editor = window.activeTextEditor;
  const position = new Position(lineNumber, 0); // colonna 0 di quella riga

  const endPosition = position.translate(0, snippet.length);
  await editor.edit(editBuilder => {
    editBuilder.insert(position, snippet);
    // Move the cursor to the end of the inserted snippet
    editor.selection = new Selection(endPosition.line, endPosition.character, endPosition.line, endPosition.character);

  });          
}  

/**
 * Register binding-related commands.
 * @param context 
 * @param sendNotification 
 */
export function registerBindingCommands(context: ExtensionContext, sendNotification?: (method: string, params: any) => Promise<void>) {
	context.subscriptions.push(
		commands.registerCommand(
			"vadacode.testBinding",
			async (binding: DatalogpmBinding) => {
				const inference = new BindingInference();

				let success = "";
				try {
					await inference.test(binding);
					window.showInformationMessage("Binding test succeeded.");
					success = 'success';
				} catch (error) {
					let message: string;
					if (error && error.response && error.response.data && error.response.data && error.response.data.errorMessage) {
						message = error.response.data.errorMessage;
					} else {
						message = "An error occurred during evaluation: " + error.toString();
					}
					window.showErrorMessage(`Binding test failed: ${message}`);
					success = 'failure';
				}

				// Notify the LSP server
				if (sendNotification) {
					sendNotification(
						"workspace/bindingTested", { 
							document: window.activeTextEditor?.document,
							binding,
							result: success
						}
					);
				}

			}
		),
		commands.registerCommand(
			"vadacode.inferBindingSchema",
			async (binding: DatalogpmBinding) => {
				const inference = new BindingInference();

				// Ask user for number of fields to infer
				const fieldsToInfer = await window.showInputBox({
					prompt: "Enter the number of fields to infer",
					value: "1",
					placeHolder: "e.g. 3",
					validateInput: (value) => {
						const num = parseInt(value, 10);
						if (isNaN(num) || num <= 0) {
							return "Please enter a valid positive integer."; 
						}
						return null; // No error
					},
				});
				if (!fieldsToInfer) return;

				const linesToRead = await window.showInputBox({
					prompt: "Enter the number of lines to sample from file",
					value: "100",
					placeHolder: "e.g. 100",
					validateInput: (value) => {
						const num = parseInt(value, 10);
						if (isNaN(num) || num <= 0) {
							return "Please enter a valid positive integer."; 
						}
						return null; // No error
					},
				});

				if (!fieldsToInfer || !linesToRead) {
					return;
				}

				try {
					const bindingInferenceResult = await inference.infer(binding, +fieldsToInfer, +linesToRead);            
					const resultSet = transpose<string>(bindingInferenceResult.resultSet);

					// Prepare vadoc snipped
					let vadocSnippet = `\n%% Description.\n%% The types below are inferred from {Reasoner/Vadacode}.\n`;
					for (const [index, columnName] of bindingInferenceResult.columnNames.entries()) {
						const type = bindingInferenceResult.types[index];

						const resultSetColumn = resultSet[index];
						const resultSetType = inferArrayType(resultSetColumn, { skipEmpty: true });

						vadocSnippet += `%% @term {${type}/${resultSetType}} ${columnName} <Description of ${columnName}>.\n`;
					}
					await insertSnippetInOpenFile(vadocSnippet, binding.inputToken.line);

					let mappingSnippet = "";
					for (const [index, columnName] of bindingInferenceResult.columnNames.entries()) {
						const type = bindingInferenceResult.types[index];
						const sample = bindingInferenceResult.resultSet[0][index];

						const resultSetColumn = resultSet[index];
						const resultSetType = inferArrayType(resultSetColumn, { skipEmpty: true });

						mappingSnippet += `@mapping("${binding.atomName}",${index},"${columnName}","${resultSetType}").\n`;              
					}

					await insertSnippetInOpenFile(mappingSnippet, binding.inputToken.line + vadocSnippet.split("\n").length + 1);

				} catch (error) {
					if (error && error.response && error.response.data && error.response.data && error.response.data.errorMessage) {
						window.showErrorMessage(`Inference failed: ${error.response.data.errorMessage}`, { modal: true, detail: error.toString() });
					} else {
						return new Error("An error occurred during evaluation: " + error.toString());
					}
				}
			}
		)
	);
}

