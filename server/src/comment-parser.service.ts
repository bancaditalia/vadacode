// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Utility to parse vadoc (%% strings) comments in jsdoc format.
 */

import { Service } from "typedi";

import { parse } from "comment-parser";

/**
 * Utility to parse jsdoc comments in vaDoc format.
 *
 * @remarks vaDoc is Vadacode custom documentation format which
 * uses %% strings to delimit documentation comments.
 * The `samples` directory contains examples of vaDoc comments.
 */
@Service()
export class CommentParserService {
  /**
   * Parse the given source code and return the parsed comments.
   * Expects a whole documentation block, i.e. a sequence of lines
   * starting with `%%`.
   *
   * @param source The source code to parse.
   * @returns The parsed comments in `comment-parser` format.
   */
  parse(source: string) {
    // Adjust start and end tags
    source = source.replace(/^%%\s*/, "/**\n * ");
    source = source.replace(/\n*\s*%%\s*/g, "\n * ");
    source += "\n*/";

    const parsed = parse(source);
    return parsed;
  }
}
