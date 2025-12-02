// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Service to support renaming of symbols.
 *
 */

import { Service } from "typedi";

import { CodeLens, Command } from "vscode-languageserver/node";

import {
  DatalogpmBinding
} from "./datalogpm/common";
import { DatalogpmDocument } from "./datalogpm/datalogpm-document";

/**
 * Service to support renaming of symbols.
 */
@Service()
export class CodeLensProviderService {
  // Set of checked bindings
  private checkedBindings: { [key: string]: string } = {};

  updateBindingTestResult(binding: DatalogpmBinding, result: string) {
    this.checkedBindings[binding.atomName] = result;
  }

  /**
   * Provide rename edits for the given document at the given position.
   * @param datalogpmDocument Datalog+/- Document
   * @returns
   */
  async provideCodeLens(
    datalogpmDocument: DatalogpmDocument
  ): Promise<CodeLens[]> {
        const codeLenses: CodeLens[] = [];

        for (const [atomName, binding] of Object.entries(datalogpmDocument.bindings)) {
          if (!binding.input) {
            continue; // Skip if the binding is not an input
          }

          const bindLength = 5;
          const testBindingRange = {
            start: { line: binding.token.line, character: binding.token.column },
            end: { line: binding.token.line, character: binding.token.column + bindLength },
          };
          // map success to check icon, failure to cross icon, other to square icon
          const result = this.checkedBindings[atomName];
          const icon = result === "success" ? "$(check)" : result === "failure" ? "$(testing-failed-icon)" : "$(primitive-square)";

          // Create a code lens for testing the binding
          codeLenses.push({
            range: testBindingRange,
            command: Command.create(
              `${icon} Test binding`,
              // 'Test binding',
              "vadacode.testBinding",
              binding),
          });

          const testInferenceRange = {
            start: { line: binding.token.line, character: binding.token.column },
            end: { line: binding.token.line, character: binding.token.column + bindLength },
          };
          codeLenses.push({
            range: testInferenceRange,
            command: Command.create(
              // `${!checked ? '$(square)' : '$(check)'} Test binding`,
              'Infer schema...',
              "vadacode.inferBindingSchema",
              binding),
          });

        }
        
        return codeLenses;
  }
}
