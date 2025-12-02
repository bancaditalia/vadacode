// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Definitions of notifications from the Language Server.
 */

import { GenericNotificationHandler } from "vscode-languageclient";

/**
 * Generic interface for client notifications from server.
 */
export interface ClientNotification {
  /** Client method invoked by language Server. */
  method: string;
  /** Handler for the client method. */
  handler: GenericNotificationHandler;
}

