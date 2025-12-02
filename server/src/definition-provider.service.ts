// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Service to provide definition information.
 */

import { Service } from "typedi";

import {
  Definition,
  DefinitionLink
} from "vscode-languageserver/node";

import { Position } from "vscode-languageserver-textdocument";
import {
  IDatalogpmToken,
  DatalogpmTokenType,
  getTokenRange,
} from "./datalogpm/common";
import { DatalogpmDocument } from "./datalogpm/datalogpm-document";

/**
 * Service to provide definition information.
 */
@Service()
export class DefinitionProviderService {
  /**
   * Provide definition information for the given document at the given position.
   * @param datalogpmDocument Datalog+/- Document
   * @param position Position in the document
   * @param token
   * @param workDoneProgress
   * @param resultProgress
   * @returns
   */
  async provideDefinitionInformation(
    datalogpmDocument: DatalogpmDocument,
    position: Position
  ): Promise<Definition | DefinitionLink[] | undefined> {
    const textDocument = datalogpmDocument?.document;
    if (!textDocument) return;

    const atomToken = datalogpmDocument.findToken(
      position,
      (token: IDatalogpmToken) => token.type === DatalogpmTokenType.ATOM
    );

    const atomName = atomToken?.text;
    if (!atomName) return;
    
    const atomDefinitionToken = this.getAtomDefinitionToken(atomName, datalogpmDocument);
    if (atomDefinitionToken && atomDefinitionToken.uri) {
      const definition: Definition = {
        uri: atomDefinitionToken.uri,
        range: getTokenRange(atomDefinitionToken),
      };
      return definition;
    }
  }

  /**
   * Get the definition token for the given atom name lookip up signature helps.
   * 
   * @param atomName Atom whose definition is to be found.
   * @param datalogpmDocument Datalog+/- Document.
   * @returns 
   */
  getAtomDefinitionToken(atomName: string, datalogpmDocument: DatalogpmDocument): IDatalogpmToken | undefined {
    for (const signatureHelp of datalogpmDocument.signatureHelps) {
      if (signatureHelp.name === atomName) {
        return signatureHelp.token;
      }
    }
  }
}
