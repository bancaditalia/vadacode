// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Manages lexer errors by overriding the default Antlr4ErrorListener.
 */

import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node";
import {
  ErrorListener as Antlr4ErrorListener,
  Lexer,
  RecognitionException,
} from "../../../datalogpm-parser/out";
import { DIAGNOSTIC_MESSAGES, ErrorTypes } from "./diagnostic-messages";

function escape(s: string, quote = false) {
  s = s.replace(/\n/g, "\\n");
  s = s.replace(/\r/g, "\\r");
  s = s.replace(/\t/g, "\\t");
  if (quote) {
    return `${s}`;
  } else {
    return s;
  }
}

function template(
  message: string | undefined,
  fields: { [key: string]: string } = {}
): string {
  if (message === undefined) {
    return "";
  }
  let replacedMessage = message;
  // Replace each field in the message with its value
  for (const [key, value] of Object.entries(fields)) {
    replacedMessage = replacedMessage.replace(`{${key}}`, value);
  }
  return replacedMessage;
}

export class LexerErrorListener extends Antlr4ErrorListener<number> {
  diagnostics: Diagnostic[] = [];

  /**
   * Upon syntax error, notify any interested parties.
   * @param recognizer
   * @param offendingSymbol
   * @param line
   * @param column
   * @param msg
   * @param e
   */
  syntaxError(
    lexer: Lexer,
    offendingSymbol: number,
    line: number,
    column: number,
    msg: string,
    exception: RecognitionException | undefined
  ) {
    const start = lexer._tokenStartCharIndex;
    const stop = lexer._input.index;
    const unexpectedSymbol = lexer._input.getText(start, stop);

    let diagnostic: Diagnostic;
    if (unexpectedSymbol) {
      const diagnosticMessage =
        DIAGNOSTIC_MESSAGES[ErrorTypes.ERR_UNRECOGNIZED_TOKEN_0];
      diagnostic = {
        range: {
          start: { line: line - 1, character: column },
          end: { line: line - 1, character: column + unexpectedSymbol.length },
        },
        severity: DiagnosticSeverity.Error,
        code: diagnosticMessage.code,
        source: "source",
        message: template(diagnosticMessage.message, {token: escape(unexpectedSymbol)}),
      };
    } else {
      const diagnosticMessage =
        DIAGNOSTIC_MESSAGES[ErrorTypes.ERR_UNRECOGNIZED_TOKEN];
      diagnostic = {
        range: {
          start: { line: line - 1, character: column },
          end: { line: line - 1, character: column + 1 },
        },
        severity: DiagnosticSeverity.Error,
        code: diagnosticMessage.code,
        source: "source",
        message: template(diagnosticMessage.message),
      };
    }
    this.diagnostics.push(diagnostic);
  }
}
