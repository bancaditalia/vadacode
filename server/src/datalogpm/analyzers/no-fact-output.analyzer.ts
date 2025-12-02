// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Analyzer for output atoms being also extensional (fact) atoms in Datalog+/- programs.
 */

import { Attributes } from 'graphology-types';
import { Diagnostic } from 'vscode-languageserver/node';
import { makeDiagnostic } from '../../diagnostics/utils';
import { ErrorTypes } from '../diagnostic-messages';
import { AtomLocation, ProgramGraph, ProgramGraphEdgeType, ProgramGraphNodeType } from '../program-graph';
import { ProgramGraphAnalyzer } from './program-graph-analyzer';

export class NoFactOutputAnalyzer implements ProgramGraphAnalyzer {

  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

		this._analyzed = true;
	}
  
	getDiagnostics(): Diagnostic[] {
    return this.inputToOutputDiagnostic();
	}

  inputToOutputDiagnostic() {
    const diagnostics: Diagnostic[] = [];

    
    const outputAtoms: { [atom: string]: {
      tokens: Attributes[],
      isEDB: boolean
    }} = {};
    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        token: string,
        atom: string,
        tokenAttributes: Attributes,
        atomAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          atomAttributes.type == ProgramGraphNodeType.ATOM &&
          attributes.type == ProgramGraphEdgeType.TOKEN_OF &&
          tokenAttributes.type == ProgramGraphNodeType.TOKEN
        ) {
          if (!outputAtoms[atom]) {
            outputAtoms[atom] = {
              tokens: [],
              isEDB: false
            };
          }

          if  (tokenAttributes.location === AtomLocation.Output) {
            outputAtoms[atom].tokens.push(tokenAttributes);
          }

          if (atomAttributes.isEDB) {
            outputAtoms[atom].isEDB = true;
          }

        }
      }
    );

    for (const atomName of Object.keys(outputAtoms)) {
      if (outputAtoms[atomName].isEDB) {
        const tokens = outputAtoms[atomName].tokens;
        for (const token of tokens) {
          const d = makeDiagnostic(
            token.token,
            ErrorTypes.ERR_NO_EXTENSIONAL_ATOM_AS_OUTPUT,
            {atom: atomName}
          );
          diagnostics.push(d);
        }
      }
    }

    return diagnostics;
  }


}