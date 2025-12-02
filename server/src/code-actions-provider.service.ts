// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Code Actions provider service to support the Code Action feature.
 */

import { Service } from "typedi";

import { Range, TextDocument, TextEdit } from "vscode-languageserver-textdocument";
import {
  CodeAction,
  CodeActionContext,
  CodeActionKind,
  Command,
  WorkspaceEdit,
} from "vscode-languageserver/node";
import { IDatalogpmToken } from "./datalogpm/common";
import { ErrorTypes } from "./datalogpm/diagnostic-messages";
import { DatalogpmDocument } from "./datalogpm/datalogpm-document";

/**
 * Code Actions provider service to support the Code Action feature.
 */
@Service()
export class CodeActionsProviderService {
  /**
   * Provide code actions for the given document at the given range.
   * @param datalogpmDocument The Datalog+/- Document
   * @param context The context in which the code actions are requested.
   * @param range The range for which the code actions are requested.
   * @returns
   */
  async provideCodeActions(
    datalogpmDocument: DatalogpmDocument,
    context: CodeActionContext,
    range: Range
  ): Promise<(Command | CodeAction)[] | undefined> {
    const codeActions: CodeAction[] = [];

    const textDocument = datalogpmDocument?.document;
    if (!textDocument) return;

    const needleToken = datalogpmDocument.findToken(
      range.start
    );

    if (!needleToken) return;

    const diagnostics = context.diagnostics;
    for (const diagnostic of diagnostics) {
      if (diagnostic.code === ErrorTypes.ERR_UNUSED_ATOM) {
        // We found an unused atom
        const range = {
          start: {
            line: needleToken.line,
            character: needleToken.column,
          },
          end: {
            line: needleToken.line,
            character: needleToken.column + needleToken.length,
          },
        };

        const fix1 = this.createExportsFix(needleToken, textDocument, range);
        codeActions.push(fix1);

        const fix2 = this.createRemoveUnusedAtomFix(
          needleToken,
          textDocument,
          range
        );
        if (fix2) {
          codeActions.push(fix2);
        }

        const fix3 = this.createOutputFix(needleToken, textDocument, range);
        codeActions.push(fix3);
      } else if (diagnostic.code === ErrorTypes.ANONYMOUS_VARIABLE) {
        const fix = this.createReplaceWithAnonymousFix(needleToken, textDocument);
        codeActions.push(fix);
      }
    }

    return codeActions;
  }

  private createExportsFix(
    token: IDatalogpmToken,
    document: TextDocument,
    range: Range
  ): CodeAction {
    const edit = {
      changes: {
        [document.uri]: [
          {
            range,
            newText: `%% @exports ${token.text}\n${token.text}`,
          },
        ],
      },
    };
    const fix = {
      title: `Add @exports tag`,
      kind: CodeActionKind.QuickFix,
      edit,
    };
    return fix;
  }

  private createOutputFix(
    token: IDatalogpmToken,
    document: TextDocument,
    range: Range
  ): CodeAction {
    const edit = {
      changes: {
        [document.uri]: [
          {
            range,
            newText: `@output("${token.text}").\n${token.text}`,
          },
        ],
      },
    };
    const fix = {
      title: `Add @output tag`,
      kind: CodeActionKind.QuickFix,
      edit,
    };
    return fix;
  }

  private createReplaceWithAnonymousFix(
    token: IDatalogpmToken,
    document: TextDocument
  ): CodeAction {
    
    const edit: WorkspaceEdit = {
      changes: {
        [document.uri]: [
          {
            range: {
              start: {
                line: token.line,
                character: token.column,
              },
              end: {
                line: token.line,
                character: token.column + token.length,
              },
            },
            newText: `_`,
          } as TextEdit,
        ],
      },
    };
    const fix: CodeAction = {
      title: `Replace with anonymous variable`,
      kind: CodeActionKind.QuickFix,
      edit,
    };
    return fix;
  }

  private createRemoveUnusedAtomFix(
    token: IDatalogpmToken,
    document: TextDocument,
    range: Range
  ): CodeAction | undefined {
    // Matches everything up to the first dot on the same line, while discarding
    // dots enclosed within quoted strings (AI-generated).
    const regex = /^[^"\n]*?(?:"[^"\n]*"[^"\n]*?)*?\./;

    const documentAhead = document.getText({
      start: range.start,
      end: {
        line: range.start.line + 1,
        character: 0,
      },
    });

    const regexMatches = documentAhead.match(regex);
    if (!regexMatches) return;

    const edit = {
      changes: {
        [document.uri]: [
          {
            range: {
              start: range.start,
              end: {
                line: range.start.line,
                character: range.start.character + regexMatches[0].length,
              },
            },
            newText: ``,
          },
        ],
      },
    };
    const fix = {
      title: `Remove generating rule of atom "${token.text}"`,
      kind: CodeActionKind.QuickFix,
      edit,
    };
    return fix;
  }
}
