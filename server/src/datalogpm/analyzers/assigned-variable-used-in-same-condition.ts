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
import { IDatalogpmVariableToken } from '../common';
import { ErrorTypes } from '../diagnostic-messages';
import { ProgramGraph, ProgramGraphEdgeType, ProgramGraphNodeType } from '../program-graph';
import { ProgramGraphAnalyzer } from './program-graph-analyzer';

export class AssignedVariableUsedInSameConditionAnalyzer implements ProgramGraphAnalyzer {

  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

		this._analyzed = true;
	}
  
	getDiagnostics(): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const variablesAtLHSPerCondition: Map<string, string[]> = new Map();
    const variablesAtRHSPerCondition: Map<string, string[]> = new Map();

    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        variable: string,
        condition: string,
        variableAttributes: Attributes,
        conditionAttributes: Attributes,
        _undirected: boolean
      ): void => {
        if (
          variableAttributes.type == ProgramGraphNodeType.VARIABLE &&
          conditionAttributes.type == ProgramGraphNodeType.CONDITION &&
          attributes.type == ProgramGraphEdgeType.VARIABLE_AT_CONDITION
        ) {
          if (attributes.leftHandSideOfAnEqCondition ) {
            if (!variablesAtLHSPerCondition.has(condition)) {
              variablesAtLHSPerCondition.set(condition, []);
            }
            const variablesAtLHS: string[] = variablesAtLHSPerCondition.get(condition)!;
            variablesAtLHS.push(variable);            
          } else {
            if (!variablesAtRHSPerCondition.has(condition)) {
              variablesAtRHSPerCondition.set(condition, []);
            }
            const variablesAtRHS: string[] = variablesAtRHSPerCondition.get(condition)!;
            variablesAtRHS.push(variable);            
          }
        }
      }
    );

    const variablesAssignedAndUsedInSameCondition: string[] = [];
    for (const condition of variablesAtLHSPerCondition.keys()) {
      const variablesAtLHS = variablesAtLHSPerCondition.get(condition) ?? [];
      const variablesAtRHS = variablesAtRHSPerCondition.get(condition) ?? [];
      const commonVariables = variablesAtLHS.filter(value => variablesAtRHS.includes(value));
      variablesAssignedAndUsedInSameCondition.push(...commonVariables);
    }

    const variableTokens: IDatalogpmVariableToken[] = [];
    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        _tokenId: string,
        variableId: string,
        tokenAttributes: Attributes,
        variableAttributes: Attributes,
        _undirected: boolean
      ): void => {
        if (
          attributes.type == ProgramGraphEdgeType.TOKEN_OF &&
          tokenAttributes.type == ProgramGraphNodeType.TOKEN &&
          variableAttributes.type == ProgramGraphNodeType.VARIABLE &&
          variablesAssignedAndUsedInSameCondition.includes(variableId)
        ) {
          variableTokens.push(tokenAttributes.token as IDatalogpmVariableToken);
        }
      }
    );

    for (const variableToken of variableTokens) {
      const diagnostic: Diagnostic = makeDiagnostic(
        variableToken,
        ErrorTypes.ERR_VARIABLE_USED_IN_SAME_CONDITION_AS_ASSIGNED,
      );
      diagnostics.push(diagnostic);
    }


    return diagnostics;
  }


}