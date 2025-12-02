// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Analyzer for bindings on unknown atoms in Datalog+/- programs.
 */

import { Attributes } from 'graphology-types';
import { Diagnostic } from 'vscode-languageserver/node';
import { makeDiagnostic } from '../../diagnostics/utils';
import { ErrorTypes } from '../diagnostic-messages';
import { AtomLocation, ProgramGraph, ProgramGraphEdgeType, ProgramGraphNodeType } from '../program-graph';
import { ProgramGraphAnalyzer } from './program-graph-analyzer';

export class BindOnUnknownAnalyzer implements ProgramGraphAnalyzer {

  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

		this._analyzed = true;
	}
  
	getDiagnostics(): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const atomBindings: { [atom: string]: Attributes[]} = {};
    const atomInputs: { [atom: string]: Attributes[]} = {};
    const atomOutputs: { [atom: string]: Attributes[]} = {};
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
          if (tokenAttributes.location === AtomLocation.Binding) {
            if (!atomBindings[atom]) {
              atomBindings[atom] = [];
            }
            atomBindings[atom].push(tokenAttributes);
          }

          if (tokenAttributes.location === AtomLocation.Input) {
            if (!atomInputs[atom]) {
              atomInputs[atom] = [];
            }
            atomInputs[atom].push(tokenAttributes);
          }
          
          if (tokenAttributes.location === AtomLocation.Output) {
            if (!atomOutputs[atom]) {
              atomOutputs[atom] = [];
            }
            atomOutputs[atom].push(tokenAttributes);
          }
        }
      }
    );

    for (const atom of Object.keys(atomBindings)) {
      const bindings = atomBindings[atom];

      // Check if the atom at least one input or one output tokens
      const inputs = atomInputs[atom] || [];
      const outputs = atomOutputs[atom] || [];
      if (bindings.length > 0 && inputs.length === 0 && outputs.length === 0) {
        // If the atom has bindings but no inputs or outputs, it is a bind-on-unknown atom
        for (const bindingToken of bindings) {
          // Bind-on-unknown found
          const diagnostic: Diagnostic = makeDiagnostic(
            bindingToken.token,
            ErrorTypes.ERR_BINDING_ON_UNKNOWN_ATOM
          );
          diagnostics.push(diagnostic);
        }      
      }
    }


    return diagnostics;
  }


}