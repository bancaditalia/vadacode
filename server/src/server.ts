// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file LSP entry point.
 *
 */

// Reflect metadata shim for TypeDi to work
import "reflect-metadata";

import { Container } from "typedi";
import { LspServer } from "./lsp-server";

const languageServer = Container.get(LspServer);
// languageServer.injectedService.doSomething();
