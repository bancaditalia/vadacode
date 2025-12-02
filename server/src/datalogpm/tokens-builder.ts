// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Datalog+/- tokens builder.
 */

import { CommonTokenStream } from "../../../datalogpm-parser/out";
import {
  IDatalogpmToken,
  TokenTag,
  DatalogpmTokenModifier,
  DatalogpmTokenType,
} from "./common";

/**
 * Datalog+/- tokens builder.
 *
 * Tokens are used by an ANTLR4 `ParseTreeWalker` to build
 * the semantic model of the program.
 */
export class TokensBuilder {
  /**
   * Build Datalog+/- tokens from a token stream.
   * @param tokenStream ANTLR4 token stream
   * @param symbolicNames Symbolic name of tokens as in the ANTLR4 grammar
   * @param uri URI of the source file being parsed
   * @returns Datalog+/- tokens
   */
  buildFrom(
    tokenStream: CommonTokenStream,
    symbolicNames: (string | null)[],
    uri: string
  ): IDatalogpmToken[] {
    tokenStream.fill();

    const tokens: IDatalogpmToken[] = [];

    for (let index = 0; index < tokenStream.tokens.length; index++) {
      const token = tokenStream.get(index);
      const line = token.line - 1;
      const column = token.column;
      const length = token.stop - token.start + 1;
      const text = token.text;
      const lexerType = symbolicNames[token.type];

      let type: DatalogpmTokenType | undefined;

      const modifiers: DatalogpmTokenModifier[] = [];
      switch (lexerType) {
        case "AT": {
          type = DatalogpmTokenType.AT;
          break;
        }
        case "ID": {
          type = DatalogpmTokenType.ID;
          break;
        }
        case "VAR": {
          type = DatalogpmTokenType.VARIABLE;
          break;
        }
        case "INTEGER": {
          type = DatalogpmTokenType.INT;
          break;
        }
        case "DOUBLE": {
          type = DatalogpmTokenType.DOUBLE;
          break;
        }
        case "STRING": {
          type = DatalogpmTokenType.STRING;
          break;
        }
        case "TRUE": {
          type = DatalogpmTokenType.BOOLEAN;
          break;
        }
        case "FALSE": {
          type = DatalogpmTokenType.BOOLEAN;
          break;
        }
        case "ANON_VAR": {
          type = DatalogpmTokenType.ANON_VAR;
          break;
        }
        case "IMPLICATION": {
          type = DatalogpmTokenType.IMPLICATION;
          break;
        }
        case "DOT": {
          type = DatalogpmTokenType.DOT;
          break;
        }
        case "EQ": {
          type = DatalogpmTokenType.EQ;
          break;
        }
        case "LINE_COMMENT":
        case "BLOCK_COMMENT": {
          // Don't set any type as we won't be using the comment
          // text as a token.
          // type = DatalogpmTokenType.COMMENT;
          break;
        }
        default:
        // Do nothing
      }

      if (type) {
        tokens.push({
          line,
          column,
          length,
          text,
          type,
          modifiers,
          tags: new Set<TokenTag>(),
          uri
        });
      }
    }

    return tokens;
  }
}
