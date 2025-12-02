// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Service for providing symbols in a document.
 *
 */

import { Service } from "typedi";

import {
  DocumentSymbol,
  SymbolInformation,
  SymbolKind,
} from "vscode-languageserver/node";

import { DocumentManagerService } from "./document-manager.service";
import { getTokenRange } from "./datalogpm/common";
import { DatalogpmDocument } from "./datalogpm/datalogpm-document";

/**
 * Service for providing symbols in a document.
 */
@Service()
export class SymbolProviderService {
  constructor(public documentManagerService: DocumentManagerService) {}

  /**
   * Provide symbols for the given document.
   * @param datalogpmDocument Datalog+/- Document
   * @returns
   */
  async provideDocumentSymbols(
    datalogpmDocument: DatalogpmDocument
  ): Promise<SymbolInformation[] | DocumentSymbol[] | undefined> {
    const atomSymbols: DocumentSymbol[] = [];

    for (const signatureHelp of datalogpmDocument.signatureHelps) {
      const atomName = signatureHelp.name;
      const datalogpmToken = signatureHelp.token;
      if (!datalogpmToken) {
        continue;
      }
      const range = getTokenRange(datalogpmToken); 

      const children: DocumentSymbol[] = signatureHelp.terms
      .filter((term) => term.token)
      .map((term) => {
        const termToken = term.token!;
        const termRange = getTokenRange(termToken);
        const termName = term.label;
        const termSymbol: DocumentSymbol = {
          name: termName,
          detail: "term",
          kind: SymbolKind.Variable,
          range: termRange,
          selectionRange: termRange,
          children: [],
        };
        return termSymbol;
      });

      const symbol: DocumentSymbol = {
        name: atomName,
        detail: 'atom',
        kind: SymbolKind.Function,
        range,
        selectionRange: range,
        children,
      };
      atomSymbols.push(symbol);
    }

    return atomSymbols;
  }
}
