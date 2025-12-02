// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Analyzer for variables in fact atoms in Datalog+/- programs.
 */

import { Attributes } from 'graphology-types';
import { Diagnostic } from 'vscode-languageserver/node';
import { makeDiagnostic } from '../../diagnostics/utils';
import { CustomDiagnosticData } from '../../isomorphic';
import { IDatalogpmToken } from '../common';
import { ErrorTypes } from '../diagnostic-messages';
import { AtomLocation, ProgramGraph, ProgramGraphEdgeType, ProgramGraphNodeType } from '../program-graph';
import { concatenateArrays } from '../set-utils';
import { ProgramGraphAnalyzer } from './program-graph-analyzer';

export class NoVariablesInFactAnalyzer implements ProgramGraphAnalyzer {

  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

		this._analyzed = true;
	}
  
	getDiagnostics(): Diagnostic[] {
    return this.noVariablesInFactDiagnostic();
	}

  noVariablesInFactDiagnostic() {
    const diagnostics: Diagnostic[] = [];

    // Check if there is a variable atom in a fact location.
    const variablesInFacts: any[] = [];

    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        variable: string,
        atomToken: string,
        variableAttributes: Attributes,
        atomTokenAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          attributes.type === ProgramGraphEdgeType.VARIABLE_AT_ATOM_TOKEN &&
          atomTokenAttributes.location === AtomLocation.Fact &&
          variableAttributes.type === ProgramGraphNodeType.VARIABLE &&
          atomTokenAttributes.type === ProgramGraphNodeType.TOKEN
        ) {
          variablesInFacts.push(variable);
        }
      }
    );


    const variablesUsedInBodyButNotInHeadTokens: IDatalogpmToken[] = concatenateArrays(
      this.programGraph.getTokensOfVariables(variablesInFacts)
    );

    for (const token of variablesUsedInBodyButNotInHeadTokens) {
      const d = makeDiagnostic(
        token,
        ErrorTypes.ERR_NO_VARIABLES_IN_FACT,
        {variable: token.text} as CustomDiagnosticData
      );
      diagnostics.push(d);
    }

    return diagnostics;
  }


}