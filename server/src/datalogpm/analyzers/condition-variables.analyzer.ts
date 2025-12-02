// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Analyzer for anonymous variables in Datalog+/- programs.
 */

import { Attributes } from 'graphology-types';
import { Diagnostic } from 'vscode-languageserver/node';
import { makeDiagnostic } from '../../diagnostics/utils';
import { IDatalogpmToken, DatalogpmTokenModifier } from '../common';
import { ErrorTypes } from '../diagnostic-messages';
import { AtomLocation, ProgramGraph, ProgramGraphEdgeType, ProgramGraphNodeType } from '../program-graph';
import { concatenateArrays } from '../set-utils';
import { ProgramGraphAnalyzer } from './program-graph-analyzer';
import { DirectedGraph } from 'graphology';
import {hasCycle} from 'graphology-dag';
import {forEachConnectedComponent} from 'graphology-components';
import {subgraph} from 'graphology-operators';

export class ConditionVariablesAnalyzer implements ProgramGraphAnalyzer {

  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

		this._analyzed = true;
	}

  getDiagnostics(): Diagnostic[] {
    const graph = new DirectedGraph();
        
    // leftHandSideOfAnEqCondition

    // Dictionary of conditions with LHS and RHS variables:
    const conditionsVariables: { [conditionToken: string]: { lhsVariable?: string, rhsVariables: Set<string> } } = {};

    this.programGraph.graph.forEachEdge(
      (
        _edge: string,
        attributes: Attributes,
        variableId: string,
        conditionToken: string,
        _variableAttributes: Attributes,
        _conditionAttributes: Attributes,
        _undirected: boolean
      ): void => {
        if (
          attributes.type === ProgramGraphEdgeType.VARIABLE_AT_CONDITION
        ) {
          if (!conditionsVariables[conditionToken]) {
            conditionsVariables[conditionToken] = {
              rhsVariables: new Set<string>()
            };
          }

          if (attributes.leftHandSideOfAnEqCondition) {
            conditionsVariables[conditionToken].lhsVariable = variableId;
          } else {
            conditionsVariables[conditionToken].rhsVariables.add(variableId);
          }
        }
      }
    );

    // Convert variable assignments to graph model 
    // of (Variable)-[:DEPENDS_ON]-(Variable).
    for (const conditionToken of Object.keys(conditionsVariables)) {
      const conditionVars = conditionsVariables[conditionToken];
      if (conditionVars.lhsVariable) {

        if (!graph.hasNode(conditionVars.lhsVariable)) {
          graph.addNode(conditionVars.lhsVariable);
        }

        for (const rhsVar of conditionVars.rhsVariables) {
          if (!graph.hasNode(rhsVar)) {
            graph.addNode(rhsVar);
          }

          graph.addEdge(conditionVars.lhsVariable, rhsVar);
        }
      }
    }

    // List of variable
    const variablesWithCycles: { [variable: string]: {
      variablesInCycle: string[]
    } } = {};

    // Split graphs into connected components and check each for cycles.
    forEachConnectedComponent(graph, component => {
      const componentSubgraph = subgraph(graph, component);
      if (hasCycle(componentSubgraph)) {
        // console.warn("Cycle detected in condition variables dependencies:", component);
        for (const variable of component) {
          variablesWithCycles[variable] = {
            variablesInCycle: component
          };
        }
      }
    });

    const diagnostics: Diagnostic[] = [];
    for (const varName of Object.keys(variablesWithCycles)) {

      const variableTokens: { [key: string]: IDatalogpmToken[] } = this.programGraph.getTokensOfVariables([varName]);
      const variablesInCycleTokens: { [key: string]: IDatalogpmToken[] } = this.programGraph.getTokensOfVariables(variablesWithCycles[varName].variablesInCycle);
      // For each key in variablesInCycleTokens, take only the first value (we only need the text)
      const variablesInCycleFirstTokens = Object.fromEntries(
        Object.entries(variablesInCycleTokens).map(
          ([key, tokens]) => [key, [tokens[0]]]
        )
      );

      const tt: IDatalogpmToken[] = concatenateArrays(variablesInCycleFirstTokens);
      const variablesInCycle = tt.map((token: IDatalogpmToken) => token.text).join(", ");
      for (const token of variableTokens[varName]) {
        const d = makeDiagnostic(
          token,
          ErrorTypes.ERR_CYCLE_IN_CONDITION_VARIABLES,
          {variables: variablesInCycle}
        );
        diagnostics.push(d);
      }
    }

    return diagnostics;
  }

}