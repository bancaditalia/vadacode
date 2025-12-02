// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Service to provide hover information.
 */

import { Service } from "typedi";

import { Hover } from 'vscode-languageserver';
import { Position } from "vscode-languageserver-textdocument";
import { BUILTINS } from "./builtins";
import { HoverFactoryService } from "./hover-factory.service";
import {
  AtomSignatureHelp,
  IDatalogpmAtomToken,
  IDatalogpmToken,
  IDatalogpmVariableToken,
  DatalogpmSignatureHelp,
  DatalogpmTokenType,
} from "./datalogpm/common";
import { DatalogpmDocument } from "./datalogpm/datalogpm-document";

function isTokenAnExistentialVariable(
  datalogpmDocument: DatalogpmDocument,
  needleToken: IDatalogpmToken
) {
  for (const tokenId in datalogpmDocument.existentialVariableTokens) {
    const token = datalogpmDocument.existentialVariableTokens[tokenId];
    if (
      needleToken.text == token.text &&
      token.line == needleToken.line &&
      token.column == needleToken.column
    ) {
      return true;
    }
  }
  return false;
}

function isTokenAMarkedNullVariable(
  datalogpmDocument: DatalogpmDocument,
  needleToken: IDatalogpmToken
) {
  for (const tokenId in datalogpmDocument.markedNullVariableNodes) {
    const token = datalogpmDocument.markedNullVariableNodes[tokenId];
    if (
      needleToken.text == token.text &&
      token.line == needleToken.line &&
      token.column == needleToken.column
    ) {
      return true;
    }
  }
  return false;
}

function isTokenAHarmfulVariable(
  datalogpmDocument: DatalogpmDocument,
  needleToken: IDatalogpmToken
) {
  for (const tokenId in datalogpmDocument.harmfulVariableTokens) {
    const token = datalogpmDocument.harmfulVariableTokens[tokenId];
    if (
      needleToken.text == token.text &&
      token.line == needleToken.line &&
      token.column == needleToken.column
    ) {
      return true;
    }
  }
  return false;
}

function isTokenADangerousVariable(
  datalogpmDocument: DatalogpmDocument,
  needleToken: IDatalogpmToken
) {
  for (const tokenId in datalogpmDocument.dangerousVariableTokens) {
    const token = datalogpmDocument.dangerousVariableTokens[tokenId];
    if (
      needleToken.text == token.text &&
      token.line == needleToken.line &&
      token.column == needleToken.column
    ) {
      return true;
    }
  }
  return false;
}

function isTokenUsedInTaintedJoinVariable(
  datalogpmDocument: DatalogpmDocument,
  needleToken: IDatalogpmToken
) {
  for (const tokenId in datalogpmDocument.usedInTaintedJoinVariableTokens) {
    const token = datalogpmDocument.usedInTaintedJoinVariableTokens[tokenId];
    if (
      needleToken.text == token.text &&
      token.line == needleToken.line &&
      token.column == needleToken.column
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Service to provide hover information.
 */
@Service()
export class HoverProviderService {
  constructor(public hoverFactoryService: HoverFactoryService) {}

  /**
   * Provide hover information for the given document at the given position.
   * @param datalogpmDocument Datalog+/- Document
   * @param position Position in the document
   * @returns
   */
  public provideHoverInformation(
    datalogpmDocument: DatalogpmDocument,
    position: Position
  ): Hover | undefined {
    const textDocument = datalogpmDocument?.document;
    if (!textDocument) return;

    const needleToken = datalogpmDocument.findToken(position);
    if (!needleToken) return;

    switch (needleToken?.type) {
      case DatalogpmTokenType.ANNOTATION: {
        const signatureHelp = BUILTINS.find(
          (signatureHelp: DatalogpmSignatureHelp) =>
            `@${needleToken.text}` === signatureHelp.name
        );
        if (!signatureHelp) return;
        return this.hoverFactoryService.makeAnnotationHover(signatureHelp);
      }
      case DatalogpmTokenType.ATOM: {
        const atomToken = needleToken as IDatalogpmAtomToken;
        const signatureHelp = datalogpmDocument.signatureHelps.find(
          (signatureHelp: DatalogpmSignatureHelp) =>
            needleToken.text === signatureHelp.name
        );
        if (!signatureHelp) return;
        return this.hoverFactoryService.makeAtomHover(signatureHelp as AtomSignatureHelp, atomToken);
      }
      case DatalogpmTokenType.VARIABLE: {
        const existential = isTokenAnExistentialVariable(
          datalogpmDocument,
          needleToken
        );
        const markedNull = isTokenAMarkedNullVariable(
          datalogpmDocument,
          needleToken
        );
        
        const harmful = isTokenAHarmfulVariable(datalogpmDocument, needleToken);
        const dangerous = isTokenADangerousVariable(
          datalogpmDocument,
          needleToken
        );
        const usedInTaintedJoin = isTokenUsedInTaintedJoinVariable(datalogpmDocument, needleToken);

        const metadata = {
          name: needleToken.text,
          existential,
          markedNull,
          harmful,
          dangerous,
          usedInTaintedJoin
        };

        return this.hoverFactoryService.makeVariableHover(metadata, needleToken as IDatalogpmVariableToken);
      }
      default:
      // Do nothing
    }
  }
}
