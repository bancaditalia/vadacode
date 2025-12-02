// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Manages parser errors by overriding the default Antlr4ErrorListener.
 */

import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node";
import {
  ErrorListener as Antlr4ErrorListener,
  NoViableAltException,
  Parser,
  RecognitionException,
  Token,
} from "../../../datalogpm-parser/out";
import {
  DIAGNOSTIC_MESSAGES,
  DiagnosticMessage,
  ErrorTypes,
} from "./diagnostic-messages";
import { VADACODE_MANUAL_DIAGNOSTIC_URL } from './common';

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

export class ParserErrorListener extends Antlr4ErrorListener<Token> {
  diagnostics: Diagnostic[] = [];

  /**
   * Upon syntax error, notify any interested parties.
   * @param parser
   * @param offendingSymbol
   * @param line
   * @param column
   * @param msg
   * @param e
   */
  syntaxError(
    parser: Parser,
    offendingSymbol: Token,
    line: number,
    column: number,
    msg: string,
    exception: RecognitionException | undefined
  ) {
    const expectedTokens = (parser as any)
      .getExpectedTokens()
      .toString((parser as any).literalNames, (parser as any).symbolicNames);

    let diagnostic: Diagnostic;

    if (exception instanceof NoViableAltException) {
      diagnostic = this.makeNoViableAlternativeDiagnostic(
        offendingSymbol,
        line,
        column
      );
    } else if (
      msg.includes("mismatched input") /*e instanceof InputMismatchException*/
    ) {
      // TODO: When InputMismatchException type is exported in the next versions of ANTLR
      // bindings, use it instead of matching string
      diagnostic = this.makeMismatchedInputDiagnostic(
        offendingSymbol.text,
        expectedTokens,
        line,
        column
      );
      // Commented as Datalog+/- grammar has no predicates
      // } else if (exception instanceof FailedPredicateException) {
    } else if (msg.includes("extraneous input")) {
      const currentToken = (parser as any).getCurrentToken();
      diagnostic = this.makeExtraneousInputDiagnostic(
        currentToken.text,
        expectedTokens,
        line,
        column
      );
    } else if (msg.includes("missing")) {
      diagnostic = this.makeMissingDiagnostic(
        (parser as any).getCurrentToken(),
        expectedTokens,
        line,
        column
      );
    } else {
      diagnostic = this.makeUnknownParsingErrorDiagnostic(
        exception?.stack,
        line,
        column
      );
    }

    this.diagnostics.push(diagnostic);
  }

  makeNoViableAlternativeDiagnostic(
    offendingSymbol: Token,
    line: number,
    column: number
  ) {
    let diagnosticMessage: DiagnosticMessage;

    if (offendingSymbol && offendingSymbol.type === Token.EOF) {
      diagnosticMessage = DIAGNOSTIC_MESSAGES[ErrorTypes.ERR_UNEXPECTED_EOF];
    } else if (offendingSymbol) {
      diagnosticMessage =
        DIAGNOSTIC_MESSAGES[ErrorTypes.ERR_UNEXPECTED_TOKEN_0];
    } else {
      diagnosticMessage = DIAGNOSTIC_MESSAGES[ErrorTypes.ERR_UNEXPECTED_TOKEN];
    }

    const href = VADACODE_MANUAL_DIAGNOSTIC_URL.replace("{diagnosticCode}", diagnosticMessage.code);
    const diagnostic: Diagnostic = {
      range: {
        start: { line: line - 1, character: column },
        end: {
          line: line - 1,
          character: column + offendingSymbol.text.length,
        },
      },
      severity: DiagnosticSeverity.Error,
      code: diagnosticMessage.code,
      codeDescription: { href },
      source: "source",
      message: template(
        diagnosticMessage.message,
        {token: escape(offendingSymbol.text)}
      ),
    };
    return diagnostic;
  }

  makeMismatchedInputDiagnostic(
    offendingText: string,
    expectedTokens: string,
    line: number,
    column: number
  ) {
    const diagnosticMessage =
      DIAGNOSTIC_MESSAGES[ErrorTypes.ERR_PARSING_ERROR_EXPECTED_0];
    const href = VADACODE_MANUAL_DIAGNOSTIC_URL.replace("{diagnosticCode}", diagnosticMessage.code);

    const diagnostic: Diagnostic = {
      range: {
        start: { line: line - 1, character: column },
        end: { line: line - 1, character: column + offendingText.length },
      },
      severity: DiagnosticSeverity.Error,
      code: diagnosticMessage.code,
      codeDescription: { href },
      source: "source",
      message: template(diagnosticMessage.message, {token: expectedTokens}),
    };
    return diagnostic;
  }

  makeMissingDiagnostic(
    currentToken: Token,
    expectedTokens: string,
    line: number,
    column: number
  ) {
    if (currentToken.type === Token.EOF) {
      const diagnosticMessage =
        DIAGNOSTIC_MESSAGES[ErrorTypes.MISSING_0_AT_EOF];
      const href = VADACODE_MANUAL_DIAGNOSTIC_URL.replace("{diagnosticCode}", diagnosticMessage.code);

      const diagnostic: Diagnostic = {
        range: {
          start: { line: line - 1, character: column },
          end: { line: line - 1, character: column + 1 },
        },
        severity: DiagnosticSeverity.Error,
        code: diagnosticMessage.code,
        codeDescription: { href },
        source: "source",
        message: template(diagnosticMessage.message, {token: expectedTokens}),
      };
      return diagnostic;
    } else {
      const diagnosticMessage = DIAGNOSTIC_MESSAGES[ErrorTypes.MISSING_0_AT];
      const diagnostic: Diagnostic = {
        range: {
          start: { line: line - 1, character: column },
          end: { line: line - 1, character: column + currentToken.text.length },
        },
        severity: DiagnosticSeverity.Error,
        code: diagnosticMessage.code,
        source: "source",
        message: template(
          diagnosticMessage.message,
          {
            expectedToken: expectedTokens,
            currentToken: currentToken.text,
          }
        ),
      };
      return diagnostic;
    }
  }

  makeExtraneousInputDiagnostic(
    currentToken: string,
    expectedTokens: string,
    line: number,
    column: number
  ) {
    const diagnosticMessage =
      DIAGNOSTIC_MESSAGES[ErrorTypes.EXTRANEOUS_INPUT_AT_0_EXPECTING_1];
    const href = VADACODE_MANUAL_DIAGNOSTIC_URL.replace("{diagnosticCode}", diagnosticMessage.code);

    const diagnostic: Diagnostic = {
      range: {
        start: { line: line - 1, character: column },
        end: { line: line - 1, character: column + currentToken.length },
      },
      severity: DiagnosticSeverity.Error,
      code: diagnosticMessage.code,
      codeDescription: { href },
      source: "source",
      message: template(
        diagnosticMessage.message,
        {
          extraneous: currentToken,
          expecting: expectedTokens,
        }
      ),
    };
    return diagnostic;
  }

  makeUnknownParsingErrorDiagnostic(
    message: string | undefined,
    line: number,
    column: number
  ) {
    const diagnosticMessage =
      DIAGNOSTIC_MESSAGES[ErrorTypes.UNKNOWN_PARSING_ERROR_0];
    const href = VADACODE_MANUAL_DIAGNOSTIC_URL.replace("{diagnosticCode}", diagnosticMessage.code);

    const diagnostic: Diagnostic = {
      range: {
        start: { line: line - 1, character: column },
        end: { line: line - 1, character: column + 1 },
      },
      severity: DiagnosticSeverity.Error,
      code: diagnosticMessage.code,
      codeDescription: { href },
      source: "source",
      message: template(diagnosticMessage.message, {message: message || "<unknown error>"}),
    };
    return diagnostic;
  }
}
