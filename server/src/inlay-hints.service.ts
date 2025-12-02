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

import { InlayHint, InlayHintKind, InlayHintLabelPart, Position } from "vscode-languageserver/node";

import { Range } from "vscode-languageserver-textdocument";
import {
  IDatalogpmAtomToken,
  IDatalogpmToken,
  DatalogpmTokenType
} from "./datalogpm/common";
import { DatalogpmDocument } from "./datalogpm/datalogpm-document";

export interface InlayHintData {
  tooltip: string;
}

/**
 * Service to provide inlay hints for Datalog+/- Documents.
 * Inlay hints are small annotations that provide additional information about code elements.
 * They can be used to indicate types, variable scopes, or other relevant information.
 * This service scans the document for variable tokens and provides inlay hints for existential variables.
 */
@Service()
export class InlayHintsService {
  /**
   * Provide inlay hints for the given document at the given range.
   * @param datalogpmDocument Datalog+/- Document
   * @param range Range in the document
   * @returns Array of inlay hints
   */
  async provideInlayHints(
    datalogpmDocument: DatalogpmDocument,
    range: Range
  ): Promise<InlayHint[]> {

    const inlayHints: InlayHint[] = [];

    // Find all tokens in the document within the given range
    const tokens: IDatalogpmToken[] = datalogpmDocument.allTokens.filter(
      (token: IDatalogpmToken) =>
        token.line >= range.start.line &&
        token.line <= range.end.line  
    );

    for (const token of tokens) {
      if (token.type === DatalogpmTokenType.ATOM) {
        const variableToken = token as IDatalogpmAtomToken;
        if (variableToken.existentialVariables && variableToken.existentialVariables.length > 0) {
          // Create an exist inlay hint at the beginning of the variable token
          const inlayHint: InlayHint = InlayHint.create(
            Position.create(variableToken.line, variableToken.column),
            [InlayHintLabelPart.create(`∃${variableToken.existentialVariables.join(", ")}:`)],
            InlayHintKind.Type
          );
          inlayHint.data = {
            tooltip: `Existential variable`
          };
          inlayHints.push(inlayHint);
        }
      }
    }

      return inlayHints;
  }

  resolve(hint: InlayHint) {
    (hint.label as InlayHintLabelPart[])[0].tooltip = hint.data.tooltip;
    // You can even add text edits to the hint if needed
    // hint.textEdits = [TextEdit.insert(Position.create(1, 1), "number")];
    return hint;
  }

}
