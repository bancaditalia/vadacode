// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Datalogpm evaluation interface.
 */

import { TextEditor, window, workspace } from "vscode";

import axios from "axios";

/**
 * Interface representing the results of reasoning.
 */
export interface Datalogpm {
  columnNames: { [atom: string]: string[] };
  resultSet: { [atom: string]: string[] };
  types: { [atom: string]: string[] };
  id: string;
  inputToken: any;
}

/**
 * Executes a Datalogpm program by sending it to the reasoner.
 * @param code 
 * @returns 
 */
export async function executeProgram(code: string) {
  const payload = `program=${encodeURIComponent(code)}`;
  const configuration = workspace.getConfiguration("vadacode");
  return axios.post(
    `${configuration.get("reasonerEndpoint")}/evaluate`,
    payload,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
}

export class Evaluator {
  async evaluate(): Promise<Datalogpm> {
    const activeEditor: TextEditor = window.activeTextEditor;
    if (
      activeEditor &&
      activeEditor.document &&
      activeEditor.document.fileName
    ) {
      const program = activeEditor.document.getText();
      const result = await executeProgram(program);
      return result.data as Datalogpm;
    }
  }

  /**
   * Evaluate a Datalogpm program.
   * @param program The Datalogpm program to evaluate.
   * @returns A promise that resolves with the evaluation result.
   */
  async evaluateProgram(program: string): Promise<Datalogpm> {
    const result = await executeProgram(program);
    return result.data as Datalogpm;
  }
}
