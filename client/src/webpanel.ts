// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file VSCode Webview View Provider for Vadacode Results.
 */

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

/**
 * Provider for Vadacode Results Webview View.
 * Exposes a webview that shows the results of execution tasks,
 * and is specifically designed to host an Angular application.
 */
export class VadacodeResultsWebviewViewProvider
  implements vscode.WebviewViewProvider
{
  public static readonly viewType = "vadacode-task-results";

  private readonly extensionPath: string;
  private readonly builtAppFolder: string;

  private _view?: vscode.WebviewView;

  extensionUri: vscode.Uri;

  public get webviewView() {
    return this._view;
  }

  constructor(extensionPath: string) {
    this.extensionPath = extensionPath;
    this.builtAppFolder =
      "vadacode-results-webview/dist/vadacode-results-webview/browser";
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      // And restrict the webview to only loading content from our extension's `media` directory.
      localResourceRoots: [
        vscode.Uri.file(path.join(this.extensionPath, this.builtAppFolder)),
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview();

    webviewView.webview.onDidReceiveMessage((message: any) => {
      switch (message.command) {
        case "alert":
          vscode.window.showErrorMessage(message.text);
          return;
      }
    });
  }

  /**
   * Returns html of the start page (index.html)
   */
  private _getHtmlForWebview() {
    // path to dist folder
    const appDistPath = path.join(this.extensionPath, this.builtAppFolder);
    const appDistPathUri = vscode.Uri.file(appDistPath);

    // path as uri
    const baseUri = this._view.webview.asWebviewUri(appDistPathUri);

    // get path to index.html file from dist folder
    const indexPath = path.join(appDistPath, "index.html");

    // read index file from file system
    let indexHtml = fs.readFileSync(indexPath, { encoding: "utf8" });

    // update the base URI tag
    indexHtml = indexHtml.replace(
      '<base href="/">',
      `<base href="${String(baseUri)}/">`
    );

    return indexHtml;
  }

  /**
   * Send a message to the webview.
   *
   * @param message Message to send.
   * @returns a boolean indicating whether the message was successfully
   * delivered to the webview.
   */
  postMessage(message: any): Thenable<boolean> {
    return this.webviewView.webview.postMessage(message);
  }
}
