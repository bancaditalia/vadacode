// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Service to provide semantic tokens.
 *
 */

import { Service } from "typedi";

import {
  SemanticTokens,
  SemanticTokensBuilder,
} from "vscode-languageserver/node";
import {
  IDatalogpmToken,
  DatalogpmTokenModifier,
  DatalogpmTokenType,
} from "./datalogpm/common";

export const tokenTypes = new Map<string, number>();
export const tokenModifiers = new Map<string, number>();

/**
 * List of VSCode semantic token types.
 * 
 * @note LSP semantic token types reference:
 *       https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide
 */
export const SemanticTokenTypes = [
  "comment",
  "string",
  "keyword",
  "number",
  "regexp",
  "operator",
  "namespace",
  "type",
  "struct",
  "class",
  "interface",
  "enum",
  "typeParameter",
  "function",
  "method",
  "decorator",
  "macro",
  "variable",
  "parameter",
  "property",
  "label",
];

/**
 * List of VSCode semantic token modifiers.
 */
export const SemanticTokenModifiers = [
  "declaration",
  "documentation",
  "readonly",
  "static",
  "abstract",
  "deprecated",
  "modification",
  "async",
];

/**
 * Mapping from Datalog+/- token types/modifiers to LSP semantic token types/modifiers.
 */
const datalogpmToLspTokenMap: {
  [key in DatalogpmTokenType]: string;
} = {
  [DatalogpmTokenType.COMMENT]: "comment",
  [DatalogpmTokenType.INT]: "number",
  [DatalogpmTokenType.DOUBLE]: "number",
  [DatalogpmTokenType.STRING]: "string",
  [DatalogpmTokenType.VARIABLE]: "variable",
  [DatalogpmTokenType.ATOM]: "function",
  [DatalogpmTokenType.ANNOTATION]: "macro",
  [DatalogpmTokenType.AT]: "operator",
  [DatalogpmTokenType.DOT]: "operator",
  [DatalogpmTokenType.ID]: "variable",
  [DatalogpmTokenType.ANON_VAR]: "macro",
  [DatalogpmTokenType.IMPLICATION]: "operator",
  [DatalogpmTokenType.EQ]: "operator",
  [DatalogpmTokenType.BOOLEAN]: "keyword",
  [DatalogpmTokenType.DATE]: "date",
  // Introduced to support additional types:
  // https://www.vadalog.org/vadalog-handbook/latest/variables-types.html
  // though these are not parser as specific token types.
  [DatalogpmTokenType.LIST]: "keyword",
  [DatalogpmTokenType.SET]: "keyword",
  [DatalogpmTokenType.UNKNOWN]: "keyword",
};

const datalogpmToLspTokenModifierMap: {
  [key in DatalogpmTokenModifier]: string;
} = {
  [DatalogpmTokenModifier.UNUSED]: "deprecated",
  [DatalogpmTokenModifier.GROUND]: "static",
  [DatalogpmTokenModifier.TEMPORAL]: "async",
  [DatalogpmTokenModifier.EXISTENTIAL]: "readonly",
};

SemanticTokenTypes.forEach((tokenType, index) =>
  tokenTypes.set(tokenType, index)
);
SemanticTokenModifiers.forEach((tokenModifier, index) =>
  tokenModifiers.set(tokenModifier, index)
);

/**
 * Parsed token interface.
 */
export interface IParsedToken {
  line: number;
  startCharacter: number;
  length: number;
  tokenType: string;
  tokenModifiers: string[];
}

/**
 * Service to provide semantic tokens.
 */
@Service()
export class SemanticProviderService {
  /**
   * Provide semantic tokens for the given Datalog+/- tokens.
   * @param tokens Datalog+/- tokens
   * @returns Semantic tokens
   */
  provideDocumentSemanticTokens(tokens: IDatalogpmToken[]): SemanticTokens {
    const allTokens = this._parseText(tokens);
    const builder = new SemanticTokensBuilder();
    allTokens.forEach((token) => {
      builder.push(
        token.line,
        token.startCharacter,
        token.length,
        this._encodeTokenType(token.tokenType),
        this._encodeTokenModifiers(token.tokenModifiers)
      );
    });
    return builder.build();
  }

  private _encodeTokenType(tokenType: string): number {
    if (tokenTypes.has(tokenType)) {
      return tokenTypes.get(tokenType)!;
    } else if (tokenType === "notInLegend") {
      console.warn("_encodeTokenType: notInLegend");
      return tokenTypes.size + 2;
    }
    console.warn(`Unknown token "${tokenType}".`);
    return 0;
  }

  private _encodeTokenModifiers(strTokenModifiers: string[]): number {
    let result = 0;
    for (let i = 0; i < strTokenModifiers.length; i++) {
      const tokenModifier = strTokenModifiers[i];
      if (tokenModifiers.has(tokenModifier)) {
        result = result | (1 << tokenModifiers.get(tokenModifier)!);
      } else if (tokenModifier === "notInLegend") {
        result = result | (1 << (tokenModifiers.size + 2));
      }
    }
    return result;
  }

  private _parseText(datalogpmTokens: IDatalogpmToken[]): IParsedToken[] {
    const r: IParsedToken[] = [];

    for (const datalogpmToken of datalogpmTokens) {
      const semanticToken = {
        line: datalogpmToken.line,
        startCharacter: datalogpmToken.column,
        length: datalogpmToken.length,
        tokenType: datalogpmToLspTokenMap[datalogpmToken.type],
        tokenModifiers: datalogpmToken.modifiers.map(
          (modifier: DatalogpmTokenModifier) =>
            datalogpmToLspTokenModifierMap[modifier]
        ),
      };
      r.push(semanticToken);
    }

    return r;
  }
}
