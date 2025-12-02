// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 *
 * @file Signature help builder.
 */

import { Service } from 'typedi';
import { SignatureHelpFactoryService } from '../signature-help-factory.service';
import {
  AtomCall,
  AtomCallType,
  AtomSignatureHelp
} from "./common";
import { VadacodeTreeWalker } from './vadacode-tree-walker';

/**
 * Builds signature helps from Datalog+/- code analysis.
 */
@Service()
export class SignatureHelpBuilder {
  constructor(private signatureHelpFactoryService: SignatureHelpFactoryService) {

  }

  buildFrom(
    vadacodeTreeWalker: VadacodeTreeWalker,
  ): AtomSignatureHelp[] {
    const atomSignatureHelps: { [atomName: string]: AtomSignatureHelp } = {};

    // Automatically build signatures based on the first occurence of an atom in head
    const headCalls = vadacodeTreeWalker.atomCalls.filter(
      (atomCall: AtomCall) => atomCall.call_type === AtomCallType.ATOM_CALL_TYPE_HEAD
    );
    for (const atomCall of headCalls) {
      const atomName = atomCall.name;
      if (atomName && !atomSignatureHelps[atomName]) {
        const signatureHelp = this.signatureHelpFactoryService.makeSignatureHelpFromAtomCall(atomCall);
        atomSignatureHelps[atomName] = signatureHelp;
      }
    }

    // Make atom from facts
    const factCalls = vadacodeTreeWalker.atomCalls.filter(
      (atomCall: AtomCall) => atomCall.call_type === AtomCallType.ATOM_CALL_TYPE_FACT
    );
    for (const atomCall of factCalls) {
      const atomName = atomCall.name;
      if (atomName && !atomSignatureHelps[atomName]) {
        const signatureHelp = this.signatureHelpFactoryService.makeAtomSignatureFromFact(atomCall);
        atomSignatureHelps[atomName] = signatureHelp;
      }
    }

    // Make atom from inputs
    const inputAtomTokens = vadacodeTreeWalker.inputAtomTokens;
    for (const [atomName, inputTokens] of Object.entries(inputAtomTokens)) {
      // Only the first input is considered a definition
      const inputToken = inputTokens[0];
      const binding = vadacodeTreeWalker.bindings[atomName];
      const mappings = vadacodeTreeWalker.mappings[atomName];
      const signatureHelp = this.signatureHelpFactoryService.makeSignatureHelpFromInput(atomName, inputToken, binding, mappings);
      atomSignatureHelps[atomName] = signatureHelp;  
    }

    // Make atom from body calls
    const bodyCalls = vadacodeTreeWalker.atomCalls.filter(
      (atomCall: AtomCall) => atomCall.call_type === AtomCallType.ATOM_CALL_TYPE_BODY
    );
    for (const bodyCall of bodyCalls) {
      const atomName = bodyCall.name;
      const validSignature = atomSignatureHelps[atomName] && atomSignatureHelps[atomName].terms.length > 0;
      if (atomName && !validSignature) {
        const signatureHelp = this.signatureHelpFactoryService.makeSignatureHelpFromAtomCall(bodyCall);
        atomSignatureHelps[atomName] = signatureHelp;
      }
    }

    // Build signatures based on comment documentation, and augment them existing one if any
    for (const [atomName, block] of Object.entries(
      vadacodeTreeWalker.atomVadocBlocks
    )) {
      const vadocSignatureHelp =
        this.signatureHelpFactoryService.makeAtomSignatureFromCommentParseBlock(
          atomName,
          block
        );

      const existingSignatureHelp: AtomSignatureHelp = atomSignatureHelps[atomName];
      if (existingSignatureHelp) {
        if (vadocSignatureHelp.documentation) {
          existingSignatureHelp.documentation = vadocSignatureHelp.documentation;
        }
        if (vadocSignatureHelp.terms.length > 0) {
          for (let termIndex = 0; termIndex < vadocSignatureHelp.terms.length; termIndex++) {
            const vadocTerm = vadocSignatureHelp.terms[termIndex];
            const existingTerm = existingSignatureHelp.terms[termIndex];

            existingTerm.label = vadocTerm.label;
            existingTerm.documentation = vadocTerm.documentation;
            existingTerm.type = vadocTerm.type;
            // Don't overwrite tokens as they are not inferred by documentation
          }
        }
        atomSignatureHelps[atomName] = existingSignatureHelp;        
      } else {
        vadocSignatureHelp.name = atomName;
        // If no existing signature, add vadoc signature help
        atomSignatureHelps[atomName] = vadocSignatureHelp as AtomSignatureHelp;
      }

      // Override implicit signature
    }
    
    return Object.values(atomSignatureHelps);
  }

}