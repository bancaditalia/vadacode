// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Extension client.
 */

import * as path from "path";
import {
  commands,
  ConfigurationChangeEvent,
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  TextDocument,
  TextEditor,
  window,
  workspace
} from "vscode";

import { DatalogpmClientError, VadacodeNotebookKernel as VadacodeNotebookKernel, DatalogpmServerError as VadacodeServerError } from "./notebook/vadacode-notebook-kernel";
import { VadacodeNotebookSerializer } from "./notebook/vadacode-notebook-serializer";
import { VadacodeResultsWebviewViewProvider } from "./webpanel";

import axios from "axios";
import { registerCopilotChatParticipant } from './copilot/copilot-chat-participant';
import { registerAddDatalogpmCopilotInstructions as registerAddCopilotInstructions } from './copilot/install-instructions';
import { Evaluator } from "./evaluator";
import { FileWatcher } from './file-watcher';
import { DEFAULT_FRAGMENT, Fragment, FRAGMENTS, PRETTY_FRAGMENTS } from './isomorphic';
import { LanguageServerClientManager } from "./lsp-client-manager";
import { makeVadacodeNotebookTemplate } from "./notebook/vadacode-notebook-template";
import { registerAddCSVToInputCommand } from './schema-inference/add-csv-to-input.command';
import { registerAddParquetToInputCommand } from './schema-inference/add-parquet-to-input.command';
import { registerBindingCommands } from './schema-inference/binding-commands';

export const NOTEBOOK_TYPE = "datalogpm-notebook";

export class VadacodeExtension {
  /** Language fragment selection. */
  _fragmentBarItem: StatusBarItem;

  /** Manager for the different LSP clients. */
  _lspClientManager: LanguageServerClientManager;

  /** Datalog+/- evaluator. */
  _evaluator: Evaluator = new Evaluator();

  /** Application log file watcher. */
  private _applicationLogWatcher: FileWatcher;

  /**
   * Extension entry point.
   * @param context The VSCode extension context.
   */
  constructor(private context: ExtensionContext) {

    // Create a new Language Server Client Manager
    this._lspClientManager = new LanguageServerClientManager(context, () => this.onClientIsReady());

    // Register fragment bar iten
    this._registerFragmentBarItem();
    this._lspClientManager.fragmentBarItem = this._fragmentBarItem;

    // The Output Panel displays a collection of OutputChannels, each of which has its own collection of messages
    // and can be used for logging purposes.
    // const outputChannel: OutputChannel = window.createOutputChannel('lsp-multi-server-example');

    // Notify the extension when a text document is opened or when the language id of a text document has been changed
    workspace.onDidOpenTextDocument((document) => {
      this.onDidOpenTextDocument(document);
    });

    // Notify the extension when a text document is closed
    workspace.onDidCloseTextDocument((document) => {
      this.onDidCloseTextDocument(document);
    });

    // Fired when there is a change in the active text editor
    window.onDidChangeActiveTextEditor((editor: TextEditor | undefined) => {
      if (editor?.document) {
        this.onDidOpenTextDocument(editor.document);
      }
    });

    // Register general commands
    this._registerEvaluateCommandAndProvider();

    // Register notebook commands
    this._registerNotebookCreationCommand();
    this._registerNotebookSerializerAndKernel();

    // Register auto-detect fragment command
    this._registerAutodetectFragmentCommand();

    // When a configuration change, manage it
    this._registerConfigurationChangeListeners();

    // Register codelens commands
    registerBindingCommands(context, (method: string, params: any) => {
      if (this._lspClientManager.client) {
        return this._lspClientManager.client.sendNotification(method, params);
      }
    });
    registerAddCSVToInputCommand(context);
    registerAddParquetToInputCommand(context);

    // Register Copilot features
    registerCopilotChatParticipant(context);
    registerAddCopilotInstructions('vadacode.addCopilotInstructions');

    // Live debugging
    commands.registerCommand('vadacode.watchLogStart', () => this._watchLogFiles());
    commands.registerCommand('vadacode.watchLogStop', () => this._stopWatchingLogFiles());

    // If there is an active file when we activate the extension, open it.
    if (window.activeTextEditor?.document) {
      this.onDidOpenTextDocument(window.activeTextEditor?.document);
    }

    this._bootstrap();
  }

  /**
   * Lifecycle event called when the LSP client is ready.
   */
  private onClientIsReady() {
    // Register workspace/didChangeFragment notification handler
    this._lspClientManager.client?.onNotification('workspace/didChangeFragment', (params: { fragment: Fragment }) => {
      this._setFragment(params.fragment);
    });

  }

  private _registerFragmentBarItem() {
    this._fragmentBarItem = window.createStatusBarItem(
      StatusBarAlignment.Right,
      100
    );
    this._fragmentBarItem.command = 'vadacode.selectFragment';
    this._fragmentBarItem.tooltip = 'Click to change fragment';
    this.context.subscriptions.push(this._fragmentBarItem);

    // Restore last choice or default from settings
    const fragment = this.context.globalState.get('fragment', FRAGMENTS[0]) as Fragment;
    // const fragment = workspace.getConfiguration("vadacode").get<Fragment>("fragment", "Warded") as Fragment;
    this._setFragment(fragment);

    // Register the "open picker" command
    const pickerCmd = commands.registerCommand(
      'vadacode.selectFragment',
      async () => {
        const AUTO_DETECT_FRAGMENT = "$(arrow-small-right) Auto-detect";
        const entries = PRETTY_FRAGMENTS.map((f) => `${f}`);
        if (window.activeTextEditor?.document) {
          entries.push(AUTO_DETECT_FRAGMENT);
        }
        const picked = await window.showQuickPick(entries.map((f: Fragment) => {
          if (f === 'Show all violations') {
            return "Zero (show all violations)";
          } else {
            return f;
          }
        }), {
          title: 'Choose fragment',
          placeHolder: 'Current: ' + this._currentFragment,
        });
        if (picked) {
          if (picked === AUTO_DETECT_FRAGMENT) {
            // Run vadacode.autoDetectFragment command
            await commands.executeCommand('vadacode.autoDetectFragment');
          } else if (picked === PRETTY_FRAGMENTS[0]) {
            // Set to Zero
            this._setFragment('Show all violations');
          } else {
            // Find the selected fragment at the index of the picked pretty fragment
            const selectedFragment = FRAGMENTS[PRETTY_FRAGMENTS.indexOf(picked as typeof PRETTY_FRAGMENTS[number])];
            // Set the selected fragment            
            this._setFragment(selectedFragment as Fragment);
          }
        }
      }
    );
    this.context.subscriptions.push(pickerCmd);
  }

  _currentFragment: Fragment;

  _setFragment(fragment: Fragment) {
    this.context.globalState.update('fragment', fragment);
    // workspace.getConfiguration("vadacode").update("fragment", fragment);


    this._currentFragment = fragment;
    let selectedFragment = PRETTY_FRAGMENTS[FRAGMENTS.indexOf(fragment as typeof FRAGMENTS[number])];
    if (!selectedFragment) {
      selectedFragment = PRETTY_FRAGMENTS[FRAGMENTS.indexOf(DEFAULT_FRAGMENT as typeof FRAGMENTS[number])];
      this.context.globalState.update('fragment', DEFAULT_FRAGMENT);
    }
    this._fragmentBarItem.text = selectedFragment;
    this._fragmentBarItem.show();

    // Notify the LSP server
    if (this._lspClientManager.client) {
      this._lspClientManager.client.sendNotification(
        'workspace/didChangeFragment', { fragment: this._currentFragment }
      );
    }
  }  

  /**
   * Bootstrap the extension.
   */
  async _bootstrap() {
    this._watchLogFiles();
  }

  _watchLogFiles() {
    const applicationLogFilename = workspace.getConfiguration("vadacode.logs.application").get<string>("filename") ?? "";
    const applicationLogInterval = workspace.getConfiguration("vadacode.logs.application").get<number>("interval") ?? 0;

    if (applicationLogFilename) {
      this._applicationLogWatcher = new FileWatcher(applicationLogFilename, applicationLogInterval, "Vadacode application log");
    }
  }
  
  _stopWatchingLogFiles() {
    if (this._applicationLogWatcher) {
      this._applicationLogWatcher.dispose();
    }
  }
  
  /**
   * Register the Vadacode notebook creation command.
   * @param context
   */
  private _registerNotebookCreationCommand() {
    this.context.subscriptions.push(
      commands.registerCommand(
        "vadacode.createNewNotebook",
        async () => {
          const data = makeVadacodeNotebookTemplate();
          const doc = await workspace.openNotebookDocument(NOTEBOOK_TYPE, data);
          await window.showNotebookDocument(doc);
        }
      )
    );
  }

  /**
   * Register the auto-detect fragment command 
   * "vadacode.autoDetectFragment": when called, it
   * informs the server to perform fragment auto-detection.
   */
  private _registerAutodetectFragmentCommand() {
    this.context.subscriptions.push(
      commands.registerCommand(
        "vadacode.autoDetectFragment",
        async () => {
          // Set to auto-detect
          return this._lspClientManager.client.sendNotification(
            'workspace/autoDetectFragment', { uri: window.activeTextEditor?.document.uri.toString() }
          );
        }
      )
    );
  }

  /**
   * Register the evaluate command along with the webview provider.
   */
  private _registerEvaluateCommandAndProvider() {
    const provider = new VadacodeResultsWebviewViewProvider(
      this.context.extensionPath
    );
    // Switch to Datalog+/- webview
    commands.executeCommand("workbench.view.extension.vadacode-task");

    this.context.subscriptions.push(
      // Evaluate command
      window.registerWebviewViewProvider(
        VadacodeResultsWebviewViewProvider.viewType,
        provider
      ),
      commands.registerCommand("vadacode.evaluateProgram", async () => {
        const autoSwitch = workspace.getConfiguration("vadacode").get<boolean>("autoSwitch") ?? false;
        if (autoSwitch) {
          // Switch to the Datalog+/- webview
          provider.webviewView.show?.(true);
        }
        try {
          // Notify the webview that the program is loading
          provider.postMessage({
            type: "loading",
            payload: undefined,
          });
          // Evaluate the program
          const data = await this._evaluator.evaluate();
          // Notify the webview with results
          provider.postMessage({
            type: "results",
            payload: data,
          });
        } catch (error) {
          // Exception management aligned with the one in the VadacodeNotebookKernel
          if (axios.isCancel(error)) {
            provider.postMessage({
              type: "error",
              payload: this._makeError(`Request canceled.`),
            });
          } else if (axios.isAxiosError(error)) {
            if (error.response) {
              // The request was made and the server responded with a status code
              // that falls out of the range of 2xx
              if (error.response.data) {
                // The server responded with an error
                const datalogpmClientError = error.response.data as DatalogpmClientError;

                provider.postMessage({
                  type: "error",
                  payload: this._makeError(
                    `Client error ${datalogpmClientError.errorCode}: ${datalogpmClientError.errorMessage}`
                  ),
                });

                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                if ("errorCode" in error.response.data) {
                  const datalogpmClientError = error.response.data as DatalogpmClientError;
                  // Reasoner replied with an error payload
                  provider.postMessage({
                    type: "error",
                    payload: this._makeError(
                      `[Client error] ${datalogpmClientError.errorCode}: ${datalogpmClientError.errorMessage}`
                    ),
                  });
                } else if ("error" in error.response.data) {
                  const datalogpmClientError = error.response.data as VadacodeServerError;
                  // We received a different error format
                  provider.postMessage({
                    type: "error",
                    payload: this._makeError(
                      `[Server error] ${datalogpmClientError.error}: ${datalogpmClientError.message}\nDetails:\n${JSON.stringify(datalogpmClientError, null, 2)}`
                    ),
                  });
                } else {
                  provider.postMessage({
                    type: "error",
                    payload: this._makeError(
                      `[Generic error]: ${JSON.stringify(error.response.data, null, 2)}`
                    ),
                  });                  
                }
              } else {
                // The server responded with a status code but no data
                provider.postMessage({
                  type: "error",
                  payload: this._makeErrorFromStatusCode(error.response.status, error.response.statusText),
                });                
              }
            } else if (error.request) {
              // The request was made but no response was received
              // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
              // http.ClientRequest in node.js
              provider.postMessage({
                type: "error",
                payload: this._makeError(error.message),
              });
            } else {
              // Something happened in setting up the request that triggered an Error
              provider.postMessage({
                type: "error",
                payload: this._makeError(error.message),
              });
            }
          } else {
            provider.postMessage({
              type: "error",
              payload: this._makeError(error.message),
            });
          }
        }
      })
    );
  }

  private _registerConfigurationChangeListeners() {
    workspace.onDidChangeConfiguration((ev: ConfigurationChangeEvent) => {
      const settingsRequiringReload = [
        "vadacode.logs.application.filename",
        "vadacode.logs.application.interval",
      ];      
      const requiresReload = settingsRequiringReload.some(setting => ev.affectsConfiguration(setting));
      if (!requiresReload) { return; }
      
      window.showInformationMessage(
        'You modified a setting which requires a reload.',
        'Reload'
      ).then(choice => {
        if (choice === 'Reload') {
          commands.executeCommand('workbench.action.reloadWindow');
        }
      });
    });
  }    


  _makeError(message: string): any {
    return {
      message,
    };
  }
  /**
   * Make an error from the status code and status text.
   * @param status HTTP status code.
   * @param statusText HTTP status text.
   * @returns An error object with the message, status, and statusText.
   */
  _makeErrorFromStatusCode(status: number, statusText: string): any {
    if (status === 405) {
      return {
        message: `Reasoner responded with HTTP error ${status}: ${statusText}. This usually means that the specified endpoint is not what you think. Do you have anything running on its port?`,
        status,
        statusText,
      };
    } else {
      return {
        message: `Reasoner responded with HTTP error ${status}: ${statusText}`,
        status,
        statusText,
      };
    }
  }

  /**
   * Register Vadacode notebook serializer and kernel.
   */
  private _registerNotebookSerializerAndKernel() {
    this.context.subscriptions.push(
      workspace.registerNotebookSerializer(
        NOTEBOOK_TYPE,
        new VadacodeNotebookSerializer()
      ),
      new VadacodeNotebookKernel()
    );
  }

  async onDidCloseTextDocument(document: TextDocument): Promise<void> {
    // Do nothing
  }

  /**
   * An event that is emitted when a text document is opened or when the language id
   * of a text document has been changed.
   * @param document Document that was opened.
   */
  async onDidOpenTextDocument(document: TextDocument): Promise<void> {
    // Check if file is managed by the extension
    if (!isFileManagedByVadacode(document)) {
      return;
    }

    // Switch to the project of the document
    this._lspClientManager.client?.sendNotification(
      'workspace/didChangeFragment', { fragment: this._currentFragment }
    );
  }

  /**
   * Show the given document in a text editor.
   * Might change the {@link window.activeTextEditor active editor}.
   *
   * @param document
   */
  async showTextDocument(document: TextDocument) {
    this._lspClientManager.client.sendNotification(
      "vadacode.showTextDocument",
      document.uri.toString()
    );
  }

  /**
   * Called when Vadacode is deactivated in VS Code.
   * @returns
   */
  public deactivate(): Thenable<void> {
    return this._lspClientManager.client.stop();
  }
}

/**
 * Returns true if the file is managed by Vadacode, false otherwise.
 * @param document Text document.
 * @returns true if the file is managed by Vadacode, false otherwise.
 */
function isFileManagedByVadacode(document: TextDocument) {
  return (
    document.languageId === "datalogpm" ||
    // Vadacode notebook cells
    document.uri.scheme === "vscode-notebook-cell" ||
    document.uri.scheme === "vscode-chat-code-block" ||
    // Copilot chat editing text model
    document.uri.scheme === "chat-editing-text-model"
  );

}



