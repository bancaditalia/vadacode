// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Service to support renaming of symbols.
 *
 */

import { Service } from "typedi";

import { _Connection, URI, WorkspaceEdit } from "vscode-languageserver/node";

import { Position, Range, TextEdit } from "vscode-languageserver-textdocument";
import {
  getTokenRange,
  IDatalogpmToken,
  IDatalogpmVariableToken,
  DatalogpmTokenType,
} from "./datalogpm/common";
import { DatalogpmDocument } from "./datalogpm/datalogpm-document";

export interface URITextEdit {
  /**
   * The range of the text document to be manipulated. To insert
   * text into a document create a range where start === end.
   */
  range: Range;
  /**
   * The string to be inserted. For delete operations use an
   * empty string.
   */
  newText: string;
  uri?: URI;
}

/**
 * Service to support renaming of symbols.
 */
@Service()
export class RenameEditsService {

  connection?: _Connection;

  /**
   * Provide rename edits for the given document at the given position.
   * @param datalogpmDocument Datalog+/- Document
   * @param position Position in the document
   * @param newName New name for the symbol
   * @returns
   */
  async provideRenameEdits(
    datalogpmDocument: DatalogpmDocument,
    position: Position,
    newName: string
  ): Promise<WorkspaceEdit | undefined> {
    const textDocument = datalogpmDocument.document;
    if (!textDocument) return;

    const needleToken = datalogpmDocument.findToken(position, 
      (token: IDatalogpmToken) =>
        token.type === DatalogpmTokenType.VARIABLE ||
        token.type === DatalogpmTokenType.ATOM
    );
    if (!needleToken) {
      return;
    }

    if (needleToken.type === DatalogpmTokenType.ATOM) {
      const workspaceEdit = this.makeAtomRenameEdit(needleToken, datalogpmDocument, newName);
      return workspaceEdit;
    } else if (needleToken.type === DatalogpmTokenType.VARIABLE) {
      const workspaceEdit = this.makeVariableRenameEdit(needleToken, datalogpmDocument, newName);
      return workspaceEdit;
    } else {
      // Show vscode message box that renames for types different from ATOM are not supported
      if (this.connection) {
        this.connection.window.showWarningMessage(
          `Rename not supported for ${needleToken.type}s.`
        );
      }
      return;
    }
  }

  /**
   * Create rename edits for a variable.
   * @param needleToken The token to rename.
   * @param datalogpmDocument The Datalog+/- Document.
   * @param newName The new name for the variable.
   * @returns The workspace edit containing the rename edits.
   */
  private makeVariableRenameEdit(needleToken: IDatalogpmToken, datalogpmDocument: DatalogpmDocument, newName: string): WorkspaceEdit | undefined {
    const variableReferences = datalogpmDocument.allTokens.filter(
      (token) => {
        const tok: IDatalogpmVariableToken = token as IDatalogpmVariableToken;
        const needle: IDatalogpmVariableToken = needleToken as IDatalogpmVariableToken;
        return tok.text === needle.text &&
        tok.type === DatalogpmTokenType.VARIABLE &&
        tok.uri === needle.uri &&
        tok.rule === needle.rule;
    });

      const textEdits = variableReferences.map(
      (token: IDatalogpmToken) => {
        const doubleQuoted = token.text.startsWith('"') && token.text.endsWith('"');
        const textEdit: URITextEdit = {
          range: getTokenRange(token),
          newText: !doubleQuoted ? newName : `"${newName}"`,
          uri: token.uri,
        };
        return textEdit;
      }
    );

    const workspaceEdit: WorkspaceEdit = {
      changes: {},
    };
    for (const textEdit of textEdits) {
      if (textEdit.uri) {
        if (!workspaceEdit.changes![textEdit.uri]) {
          workspaceEdit.changes![textEdit.uri] = [];
        }
        workspaceEdit.changes![textEdit.uri].push({
          range: textEdit.range,
          newText: textEdit.newText,
        } as TextEdit);
      }
    }
    return workspaceEdit;
  }

  /**
   * Create rename edits for an atom.
   * @param needleToken The token to rename.
   * @param datalogpmDocument The Datalog+/- Document.
   * @param newName The new name for the atom.
   * @returns The workspace edit containing the rename edits.
   */
  private makeAtomRenameEdit(needleToken: IDatalogpmToken, datalogpmDocument: DatalogpmDocument, newName: string) {
    // Remove quotes from the atom name if present (when it is a string e.g. in annotations)
    const atomName = needleToken.text.replace(/"/g, "");

    const atomReferences = datalogpmDocument.allTokens.filter(
      (token: IDatalogpmToken) => token.type === DatalogpmTokenType.ATOM &&
        (token.text === atomName || token.text === `"${atomName}"`) &&
        token.uri === needleToken.uri
    );

    const textEdits = atomReferences.map(
      (token: IDatalogpmToken) => {
        const doubleQuoted = token.text.startsWith('"') && token.text.endsWith('"');
        const textEdit: URITextEdit = {
          range: getTokenRange(token),
          newText: !doubleQuoted ? newName : `"${newName}"`,
          uri: token.uri,
        };
        return textEdit;
      }
    );

    const workspaceEdit: WorkspaceEdit = {
      changes: {},
    };
    for (const textEdit of textEdits) {
      if (textEdit.uri) {
        if (!workspaceEdit.changes![textEdit.uri]) {
          workspaceEdit.changes![textEdit.uri] = [];
        }
        workspaceEdit.changes![textEdit.uri].push({
          range: textEdit.range,
          newText: textEdit.newText,
        } as TextEdit);
      }
    }
    return workspaceEdit;
  }
}
