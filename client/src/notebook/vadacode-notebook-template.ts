// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Vadacode notebook template, used for template generation command.
 */

import { NotebookCellData, NotebookCellKind, NotebookData } from "vscode";
import { LANGUAGE_ID } from '../isomorphic';

export function makeVadacodeNotebookTemplate() {

  const markupCell = new NotebookCellData(
    NotebookCellKind.Markup,
    `### Hello Vadacode!

This is a sample Vadacode notebook. You can use it to write and run Datalog+/- code directly within VS Code.`,
    "markdown"
  );

  const codeCell = new NotebookCellData(
    NotebookCellKind.Code,
    `hello("world").\nhi(X) :- hello(X).\n\n@output("hi").`,
    LANGUAGE_ID
  );
  const data = new NotebookData([markupCell, codeCell]);
  data.metadata = {
    custom: {
      cells: [],
      metadata: {
        orig_nbformat: 4,
      },
      nbformat: 4,
      nbformat_minor: 2,
    },
  };
  return data;
}
