// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Service for providing signature help.
 */

import { Service } from "typedi";

import { Position } from "vscode-languageserver-textdocument";
import {
  CancellationToken,
  SignatureHelp,
  SignatureHelpContext,
  SignatureInformation,
} from "vscode-languageserver/node";
import { BUILTINS } from "./builtins";
import {
  DatalogpmSignatureHelp,
  DatalogpmSignatureTermHelp,
} from "./datalogpm/common";
import { DatalogpmDocument } from "./datalogpm/datalogpm-document";

/**
 * Service for providing signature help.
 */
@Service()
export class SignatureHelpProviderService {
  /**
   * Provide signature help for the given document at the given position.
   * @param datalogpmDocument Datalog+/- Document
   * @param position Position in the document
   * @param token
   * @param context
   * @returns
   */
  async provideSignatureHelp(
    datalogpmDocument: DatalogpmDocument,
    position: Position,
    token: CancellationToken,
    context?: SignatureHelpContext
  ): Promise<SignatureHelp | undefined> {
    let activeParameter = 0;
    if (context && context.isRetrigger) {
      if (context.activeSignatureHelp) {
        if (context.triggerCharacter === ",") {
          context.activeSignatureHelp!.activeParameter! += 1;
          activeParameter = context.activeSignatureHelp!.activeParameter!;
        }
        return context.activeSignatureHelp;
      }
    }

    const range = {
      start: { line: position.line, character: 0 },
      end: position,
    };
    const atomName = datalogpmDocument.document.getText(range);

    const datalogpmSignatureHelps: DatalogpmSignatureHelp[] = [
      ...BUILTINS,
      ...datalogpmDocument.signatureHelps,
    ];

    // Signature help triggers when trigger character is fired (e.g. "atom(")
    const signatureHelps: SignatureHelp[] = datalogpmSignatureHelps
      .filter((datalogpmSignatureHelp: DatalogpmSignatureHelp) =>
        atomName.startsWith(`${datalogpmSignatureHelp.name}(`)
      )
      .map((datalogpmSignatureHelp: DatalogpmSignatureHelp) => {
        const signatureHelp: SignatureHelp = {
          signatures: [
            SignatureInformation.create(
              datalogpmSignatureHelp.signature,
              datalogpmSignatureHelp.documentation,
              ...datalogpmSignatureHelp.terms.map(
                (datalogpmSignatureTermHelp: DatalogpmSignatureTermHelp) => {
                  return {
                    label: datalogpmSignatureTermHelp.label,
                    documentation: datalogpmSignatureTermHelp.documentation,
                  };
                }
              )
            ),
          ],
          activeSignature: 0,
          activeParameter,
        };

        return signatureHelp;
      });

    return signatureHelps[0];
  }
}
