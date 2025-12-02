// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Analyzer for input atoms being also output atoms in Datalog+/- programs.
 */

import { Attributes } from 'graphology-types';
import { Diagnostic } from 'vscode-languageserver/node';
import { AtomLocation, ProgramGraph, ProgramGraphEdgeType, ProgramGraphNodeType } from '../program-graph';
import { ProgramGraphAnalyzer } from './program-graph-analyzer';

export class InputToOutputAnalyzer implements ProgramGraphAnalyzer {

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

    
    const inputAtoms: { [atom: string]: Attributes[]} = {};
    const outputAtoms: { [atom: string]: Attributes[]} = {};
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
          if  (tokenAttributes.location === AtomLocation.Input) {
            if (!inputAtoms[atom]) {
              inputAtoms[atom] = [];
            }
            inputAtoms[atom].push(tokenAttributes);
          }
          if  (tokenAttributes.location === AtomLocation.Output) {
            if (!outputAtoms[atom]) {
              outputAtoms[atom] = [];
            }
            outputAtoms[atom].push(tokenAttributes);
          }
        }
      }
    );

    // Filter input and output with the same name
    const inputAtomNames = Object.keys(inputAtoms);
    const outputAtomsNames = Object.keys(outputAtoms);
    const inputAndOutputAtoms = inputAtomNames.filter((atomName) => {
      return outputAtomsNames.includes(atomName);
    });    

    for (const atomName of inputAndOutputAtoms) {
      const tokens = [...inputAtoms[atomName], ...outputAtoms[atomName]];
      
      // Check works, just commented out as this analyzer is not used
      // anymore (replaced by no-edb-output.analyzer.ts)
      // for (const token of tokens) {
      //   const d = makeDiagnostic(
      //     token.token,
      //     DiagnosticSeverity.Error,
      //     ErrorTypes.ERR_INPUT_ATOM_AS_OUTPUT_0,
      //     {atom: atomName}
      //   );
      //   diagnostics.push(d);
      // }
    }

    return diagnostics;
  }


}