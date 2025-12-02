// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Vadacode notebook kernel.
 */

import axios from "axios";
import * as vscode from "vscode";
import { executeProgram } from "../evaluator";
import { NOTEBOOK_TYPE } from '../vadacode-extension';

/**
 * Datalog+/- reasoner client error interface for showing errors in notebook cells.
 */
export interface DatalogpmClientError {
  errorMessage: string;
  errorCode: string;
}

/**
 * Datalog+/- reasoner server error interface for showing errors in notebook cells.
 */
export interface DatalogpmServerError {
  error: string;
  message: string;
}


/**
 * Vadacode notebook kernel.
 */
export class VadacodeNotebookKernel {
  private readonly _id = "vadacode-notebook-kernel";
  private readonly _label = "Vadacode Kernel";
  private readonly _supportedLanguages = ["datalogpm"];

  private _executionOrder = 0;
  private readonly _controller: vscode.NotebookController;

  // Upon interrupt signal, we need to cancel the request to the request
  // to the server. This might prove useful in those cases in which the notebook
  // execution cell stays up indefinitely, which might happen if the server
  // effectively is there but doesn't respond to the request in due time
  // (which might even be minutes).
  // https://axios-http.com/docs/cancellation
  axiosAbortController = new AbortController();

  /**
   * Create a new Vadacode notebook kernel.
   */
  constructor() {
    this._controller = vscode.notebooks.createNotebookController(
      this._id,
      NOTEBOOK_TYPE,
      this._label
    );

    this._controller.supportedLanguages = this._supportedLanguages;
    this._controller.supportsExecutionOrder = true;
    this._controller.interruptHandler = async () => {
      // Cancel the request
      this.axiosAbortController.abort();
    };
    this._controller.executeHandler = this._executeAll.bind(this);
  }

  /**
   * Dispose the Vadacode notebook kernel with the free associated resources.
   */
  dispose(): void {
    this._controller.dispose();
  }

  /**
   * Run all cells in the notebook, stricly sequentially.
   * @param cells The cells to run.
   * @param _notebook The notebook document.
   * @param _controller The notebook controller.
   */
  private async _executeAll(
    cells: vscode.NotebookCell[],
    _notebook: vscode.NotebookDocument,
    _controller: vscode.NotebookController
  ): Promise<void> {
    for (const cell of cells) {
      await this._doExecution(cell);
    }
  }

  /**
   * Execute a single notebook cell.
   * @param cell The cell to execute.
   * @returns A promise that resolves when the cell execution is completed.
   */
  private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
    const execution = this._controller.createNotebookCellExecution(cell);
    execution.executionOrder = ++this._executionOrder;
    execution.start(Date.now());

    try {
      const code = cell.document.getText();
      const response = await executeProgram(code);

      await this._setCellSuccess(execution, response.data);

      execution.end(true, Date.now());
    } catch (error) {
      if (axios.isCancel(error)) {
        await this._setCellError(execution, new Error(`Request canceled.`));
      } else if (axios.isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          if ("errorCode" in error.response.data) {
            const datalogpmClientError = error.response.data as DatalogpmClientError;
            // Datalog+/- reasoner replied with an error payload
            await this._setCellError(
              execution,
              new Error(
                `[Client error] ${datalogpmClientError.errorCode}: ${datalogpmClientError.errorMessage}`
              )
            );
          } else if ("error" in error.response.data) {
            const datalogpmServerError = error.response.data as DatalogpmServerError;
            // We received a different error format
            await this._setCellError(
              execution,
              new Error(
                `[Server error] ${datalogpmServerError.error}: ${datalogpmServerError.message}\nDetails:\n${JSON.stringify(datalogpmServerError, null, 2)}`
              )
            );
          } else {
            // We received a different error format
            await this._setCellError(
              execution,
              new Error(
                `[Generic error]: ${JSON.stringify(error.response.data, null, 2)}`
              )
            );
          }
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          await this._setCellError(execution, error);
        } else {
          // Something happened in setting up the request that triggered an Error
          await this._setCellError(execution, error);
        }
      } else {
        await this._setCellError(execution, error);
      }

      execution.end(false, Date.now());
    }
  }

  /**
   * Replace the output of a cell with an error log.
   * @param {vscode.NotebookCellExecution} execution Execution of the cell.
   * @param error Error object.
   * @returns
   */
  private async _setCellError(
    execution: vscode.NotebookCellExecution,
    error: Error
  ) {
    return execution.replaceOutput([
      new vscode.NotebookCellOutput([
        vscode.NotebookCellOutputItem.error(error),
      ]),
    ]);
  }

  /**
   * Replace the output of a cell with the results of the execution.
   *
   * @remarks Cell output uses `datalogpm-results-table` component to display the results.
   *
   * @param {vscode.NotebookCellExecution} execution Execution of the cell.
   * @param data Data to display.
   * @returns
   */
  private async _setCellSuccess(
    execution: vscode.NotebookCellExecution,
    data: any
  ) {
    return execution.replaceOutput([
      new vscode.NotebookCellOutput([
        vscode.NotebookCellOutputItem.json(
          {
            type: "results",
            results: data,
          },
          "x-application/datalogpm-results-table"
        ),
      ]),
    ]);
  }
}
