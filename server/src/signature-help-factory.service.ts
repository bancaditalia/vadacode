// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Signature help factory service.
 *
 */

import { Service } from "typedi";

import { Block, Spec } from "comment-parser";
import { AtomCall, AtomSignatureHelp, IDatalogpmToken, DatalogpmGenericBinding, DatalogpmMapping, DatalogpmSignatureHelp, DatalogpmSignatureSource, DatalogpmSignatureTermHelp, DatalogpmTokenType } from "./datalogpm/common";

/**
 * Factory service to produce signature help objects.
 */
@Service()
export class SignatureHelpFactoryService {
  /**
   * Make a signature help object for an atom.
   * @param atomName Name of the atom.
   * @param block Comment parse block.
   * @returns Signature help object.
   */
  makeAtomSignatureFromCommentParseBlock(
    atomName: string,
    block: Block
  ): DatalogpmSignatureHelp {
    const terms = block.tags
      // Filter out tags that are not of type "term"
      .filter((tag: Spec) => tag.tag == "term")
      // and ensure that the tag has a name (minimum requirement)
      .filter((tag: Spec) => tag.name)
      .map((tag: Spec) => {
        let type: DatalogpmTokenType | undefined = undefined;
        switch(tag.type) {
          case "string":
            type = DatalogpmTokenType.STRING;
            break;
          case "int":
            type = DatalogpmTokenType.INT;
            break;
          case "double":
            type = DatalogpmTokenType.DOUBLE;
            break;
            case "boolean":
              type = DatalogpmTokenType.BOOLEAN;
              break;
          }
        return {
          label: tag.name,
          documentation: tag.description,
          type
        };
      });

    const signatureHelp: DatalogpmSignatureHelp = {
      name: atomName,
      signature: `${atomName}(${block.tags.map((tag: Spec) => tag.name).join(", ")}).`,
      documentation: block.description,
      terms ,
      source: DatalogpmSignatureSource.DOCUMENTATION
    };

    return signatureHelp;
  }


  makeSignatureHelpFromAtomCall(atomCall: AtomCall): AtomSignatureHelp {  
    const atomName = atomCall.name;
    const terms = atomCall.terms.map((term: IDatalogpmToken): DatalogpmSignatureTermHelp => {
      return {
        label: term.text,
        documentation: "",
        token: term
      };
    });
    
    const signatureHelp = {
      name: atomName,
      signature: `${atomName}().`,
      token: atomCall.atom,
      documentation: "",
      terms,
      source: DatalogpmSignatureSource.USAGE
    } as AtomSignatureHelp;
    return signatureHelp;
  }

  makeAtomSignatureFromFact(atomCall: AtomCall): AtomSignatureHelp {
    const terms = atomCall.terms.map((term: IDatalogpmToken, index: number): DatalogpmSignatureTermHelp => {
      return {
        label: `Term${index + 1}`,
        documentation: "",
        token: term,
        type: term.type,
      } as DatalogpmSignatureTermHelp;
    });

    const atomName = atomCall.name;
    const signatureHelp = {
      name: atomName,
      token: atomCall.atom,
      signature: "fact",
      documentation: "",
      terms,
      source: DatalogpmSignatureSource.FACT
    } as AtomSignatureHelp;

    return signatureHelp;
  }

  makeSignatureHelpFromInput(atomName: string, inputToken: IDatalogpmToken, _binding: DatalogpmGenericBinding, mappings: DatalogpmMapping[]): AtomSignatureHelp {
    let terms: DatalogpmSignatureTermHelp[] = [];
    if (mappings) {
      const orderedMappings: DatalogpmMapping[] = [];
    
      for (let mappingIndex = 0; mappingIndex < mappings.length; mappingIndex++) {
        const mapping = mappings[mappingIndex];
        orderedMappings[mapping.position] = mapping;
      } 
  
      terms = orderedMappings.map((mapping: DatalogpmMapping, index: number): DatalogpmSignatureTermHelp => {
        return {
          label: mapping.columnName,
          documentation: "",
          token: mapping.token,
          type: mapping.columnType,
          source: DatalogpmSignatureSource.INPUT
        } as DatalogpmSignatureTermHelp;
      });
    }
    
    const signatureHelp = {
      name: atomName,
      signature: `${atomName}(${terms.map(term => term.label).join(", ")}).`,
      token: inputToken,
      documentation: "",
      terms
    } as AtomSignatureHelp;
    return signatureHelp;

  }

}
