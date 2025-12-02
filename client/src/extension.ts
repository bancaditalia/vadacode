// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Main extension entry point.
 */

import { ExtensionContext } from "vscode";

import { logBanner } from "./banner";
import { VadacodeExtension } from "./vadacode-extension";

/**
 * Vadacode client instance.
 */
let vadacodeClient: VadacodeExtension;

/**
 * Main entry point for the extension, it's called when Vadacode
 * is activated in VS Code.
 * @param context Vadacode context.
 */
export function activate(context: ExtensionContext) {
  logBanner();

  vadacodeClient = new VadacodeExtension(context);
}

/**
 * Called when Vadacode is deactivated in VS Code.
 * @returns
 */
export function deactivate(): Thenable<void> {
  console.log("Deactivating Vadacode...");
  return vadacodeClient.deactivate();
}
