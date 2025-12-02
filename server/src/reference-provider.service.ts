// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Service to provide references.
 *
 */

import { Service } from "typedi";

import {
  _Connection,
  Location,
  ProgressToken,
  ReferenceContext,
} from "vscode-languageserver/node";

import { Position, Range } from "vscode-languageserver-textdocument";
import { IDatalogpmAtomToken, IDatalogpmToken, DatalogpmTokenType } from "./datalogpm/common";
import { DatalogpmDocument } from "./datalogpm/datalogpm-document";

/**
 * Service to provide references.
 */
@Service()
export class ReferenceProviderService {

  connection?: _Connection;
  
  /**
   * Provide references for the given document at the given position.
   * @param datalogpmDocument Datalog+/- Document
   * @param context Reference context
   * @param position Position in the document
   * @param progressToken
   * @param workDoneToken
   * @returns
   */
  async provideReferences(
    datalogpmDocument: DatalogpmDocument,
    context: ReferenceContext,
    position: Position,
    progressToken?: ProgressToken,
    workDoneToken?: ProgressToken
  ): Promise<Location[] | undefined> {
    const textDocument = datalogpmDocument?.document;
    if (!textDocument) return;

    const needleToken = datalogpmDocument.findToken(
      position,
      (token: IDatalogpmToken) =>
        token.type === DatalogpmTokenType.ATOM
    );

    if (!needleToken) {
      return;
    }

    if (needleToken.type === DatalogpmTokenType.ATOM) {
      const workspaceEdit = this.findAtomReferences(needleToken as IDatalogpmAtomToken, datalogpmDocument);
      return workspaceEdit;
    } else {
      // Show vscode message box that renames for types different from ATOM are not supported
      if (this.connection) {
        this.connection.window.showWarningMessage(
          `Rename not supported for ${needleToken.type}s.`
        );
      }
      console.warn(`Rename not supported for ${needleToken.type}s.`);
      return;
    }


  }
  findAtomReferences(needleToken: IDatalogpmAtomToken, datalogpmDocument: DatalogpmDocument): Location[] {
    const atomName = needleToken.text.replace(/"/g, "");
    const tokens = datalogpmDocument?.allTokens.filter(
      (token: IDatalogpmToken) =>
          token.type === DatalogpmTokenType.ATOM && token.text === atomName
    );

    const locations: Location[] = tokens.map((token: IDatalogpmToken) => {
      return {
        uri: token.uri,
        range: {
          start: {
            line: token.line,
            character: token.column,
          },
          end: {
            line: token.line,
            character: token.column + token.length,
          },
        } as Range,
      } as Location;
    });
    return locations;

  }
}
