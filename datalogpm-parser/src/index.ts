// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Datalog+/- parser exports.
 */

export * from "antlr4";
export * as DatalogpmLexer from "./grammar/DatalogpmLexer";
export * as DatalogpmListener from "./grammar/DatalogpmListener";
export * as DatalogpmParser from "./grammar/DatalogpmParser";
export * as DatalogpmVisitor from "./grammar/DatalogpmVisitor";
