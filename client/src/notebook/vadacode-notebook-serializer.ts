// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Vadacode notebook serializer.
 */

import { TextDecoder, TextEncoder } from "util";
import {
  CancellationToken,
  NotebookCellData,
  NotebookCellExecutionSummary,
  NotebookCellKind,
  NotebookCellOutput,
  NotebookCellOutputItem,
  NotebookData,
  NotebookSerializer,
} from "vscode";

interface VadacodeNotebookCellOutputItem {
  mime: string;
  data: string;
}

interface VadacodeNotebookDataCellOutput {
  items: VadacodeNotebookCellOutputItem[];
  metadata?: { [key: string]: any };
}

interface VadacodeNotebookDataCell {
  kind: NotebookCellKind;
  languageId: string;
  value: string;
  outputs?: VadacodeNotebookDataCellOutput[];
  executionSummary?: NotebookCellExecutionSummary;
  metadata?: { [key: string]: any };
  // Legacy fields ---
  // Original notebooks used language instead of languageId
  language?: string;
}

interface VadacodeNotebookData {
  cells: VadacodeNotebookDataCell[];
}

/**
 * The notebook serializer enables the editor to open Vadacode notebook files.
 */
export class VadacodeNotebookSerializer implements NotebookSerializer {
  public readonly label: string = "Vadacode Serializer";

  /**
   * Deserialize contents of a notebook file into the notebook data structure.
   *
   * @param content Contents of a notebook file.
   * @param token A cancellation token.
   * @returns Notebook data or a thenable that resolves to such.
   */
  public async deserializeNotebook(
    data: Uint8Array,
    _token: CancellationToken
  ): Promise<NotebookData> {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const contents = decoder.decode(data);

    // Read file contents
    let vadacodeNotebookData: VadacodeNotebookData;
    try {
      vadacodeNotebookData = <VadacodeNotebookData>JSON.parse(contents);
    } catch {
      vadacodeNotebookData = { cells: [] };
    }

    const cells: NotebookCellData[] = [];
    for (const vadacodeNotebookDataCell of vadacodeNotebookData.cells) {
      const cell = new NotebookCellData(
        vadacodeNotebookDataCell.kind,
        vadacodeNotebookDataCell.value,
        // For retrocompatibility (prior to 0.0.7), use even language field
        vadacodeNotebookDataCell.languageId || vadacodeNotebookDataCell.language
      );
      cell.metadata = vadacodeNotebookDataCell.metadata;
      cell.executionSummary = vadacodeNotebookDataCell.executionSummary;

      if (vadacodeNotebookDataCell.outputs) {
        const outputs = vadacodeNotebookDataCell.outputs.map(
          (output: VadacodeNotebookDataCellOutput) => {
            const items = output.items.map(
              (item: VadacodeNotebookCellOutputItem) => {
                return {
                  data: encoder.encode(item.data),
                  mime: item.mime,
                };
              }
            );
            return {
              items,
              metadata: output.metadata,
            };
          }
        );
        cell.outputs = outputs;
      }

      cells.push(cell);
    }

    return { cells } as NotebookData;
  }

  /**
   * Serialize notebook data into file contents.
   *
   * @param data A notebook data structure.
   * @param token A cancellation token.
   * @returns An array of bytes or a thenable that resolves to such.
   */
  public async serializeNotebook(
    data: NotebookData,
    _token: CancellationToken
  ): Promise<Uint8Array> {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    // Map the Notebook data into the format we want to save the Notebook data as
    const contents: VadacodeNotebookData = { cells: [] };

    for (const cell of data.cells) {
      const vadacodeNotebookDataCell = {
        kind: cell.kind,
        languageId: cell.languageId,
        value: cell.value,
      } as VadacodeNotebookDataCell;
      vadacodeNotebookDataCell.metadata = cell.metadata;
      vadacodeNotebookDataCell.executionSummary = cell.executionSummary;

      if (cell.outputs) {
        const outputs = cell.outputs.map((output: NotebookCellOutput) => {
          const items = output.items.map((item: NotebookCellOutputItem) => {
            return {
              data: decoder.decode(item.data),
              mime: item.mime,
            };
          });
          return {
            items,
            metadata: output.metadata,
          };
        });
        vadacodeNotebookDataCell.outputs = outputs;
      }

      contents.cells.push(vadacodeNotebookDataCell);
    }

    const notebookJson = JSON.stringify(contents, null, 2);

    return encoder.encode(notebookJson);
  }
}
