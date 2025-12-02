// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Language Server Client Manager.
 */

import * as path from "path";
import { ExtensionContext, StatusBarItem } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import {
  ClientNotification
} from "./notifications";

/**
 * Create the Language Server options.
 * @param serverModule
 * @returns ServerOptions object
 */
function makeServerOptions(serverModule: string): ServerOptions {
  const serverOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  } as ServerOptions;
  return serverOptions;
}

/**
 * Create a Vadacode Language Client.
 * @param serverModule
 * @returns
 */
async function createVadacodeClient(
  serverModule: string
): Promise<LanguageClient> {
  const serverOptions = makeServerOptions(serverModule);
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      {
        scheme: "file",
        language: "datalogpm",
      },
      {
        scheme: "vscode-notebook-cell",
        language: "datalogpm",
      },
      {
        scheme: "untitled",
        language: "datalogpm",
      },
      {
        scheme: "vscode-chat-code-block",
        language: "datalogpm",
      },
      {
        scheme: "chat-editing-text-model",
        language: "datalogpm",
      },
    ]
  };
  // Create the language client and start the client.
  const client = new LanguageClient(
    "vadacodeLSP",
    `Vadacode Language Server`,
    serverOptions,
    clientOptions
  );

  await client.start();
  return client;
}

/**
 * Class to manage the Language Server Clients.
 */
export class LanguageServerClientManager {

  /** Language client for the project. */
  client?: LanguageClient;

  context: ExtensionContext;

  fragmentBarItem?: StatusBarItem;

  constructor(context: ExtensionContext, callback?: () => void) {
    this.context = context;

    createVadacodeClient(
      this.makeServerModule()
    ).then((client) => {
      this.client = client;
      if (callback) {
        callback();
      }
    });

  }

  makeServerModule() {
    // The server is implemented in node
    const serverModule = this.context.asAbsolutePath(
      path.join("server", "out", "server.js")
    );
    return serverModule;
  }

  /**
   * Register a notification for a client.
   */
  _registerNotification(
    notification: ClientNotification,
    client: LanguageClient
  ) {
    client.onNotification(notification.method, (...args) => {
      notification.handler(...args);
    });
  }
}
