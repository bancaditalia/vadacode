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

export class AnonymousVariablesAnalyzer implements ProgramGraphAnalyzer {

  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

		this._analyzed = true;
	}
  
	getDiagnostics(): Diagnostic[] {
    return this.getDiagnostics2();
	}

  getVariablesUsedInBodyButNotInHead(): IDatalogpmToken[] {
    const variables: { [variable: string]: { appearInHead: boolean, appearInBody: number } } = {};
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
          attributes.type === ProgramGraphEdgeType.VARIABLE_AT_ATOM_TOKEN
        ) {
          if (!variables[variable]) {
            variables[variable] = {
              appearInHead: false,
              appearInBody: 0
            };
          }

          if (atomTokenAttributes.location === AtomLocation.Head) {
            variables[variable].appearInHead = true;
          }
          if (atomTokenAttributes.location === AtomLocation.Body) {
            variables[variable].appearInBody++;
          }

        }
      }
    );

    const variablesUsedInOneBodyAtom: string[] = [];
    for (const variable of Object.keys(variables)) {
      if (variables[variable].appearInBody === 1 && !variables[variable].appearInHead) {
        variablesUsedInOneBodyAtom.push(variable);
      }
    }

    const variablesUsedInConditions = this.programGraph.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => {
        // Let's start from positions
        const isVariable = attributes.type === ProgramGraphNodeType.VARIABLE;

        if (!isVariable) return false;

        // Check edges from variable to position in head
        const edges = this.programGraph.graph.filterEdges(
          (
            edge: string,
            attributes: Attributes,
            source: string,
            target: string,
            sourceAttributes: Attributes,
            targetAttributes: Attributes,
            undirected: boolean
          ): boolean =>
            source == _nodeId &&
            (attributes.type == ProgramGraphEdgeType.VARIABLE_AT_CONDITION) &&
            !attributes.head
        );

        return edges.length > 0;
      }
    );   

    const variablesUsedAsContributors = this.programGraph.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => {
        // Let's start from positions
        const isVariable = attributes.type === ProgramGraphNodeType.VARIABLE;

        if (!isVariable) return false;

        // Check edges from variable to position in head
        const edges = this.programGraph.graph.filterEdges(
          (
            edge: string,
            attributes: Attributes,
            source: string,
            target: string,
            sourceAttributes: Attributes,
            targetAttributes: Attributes,
            undirected: boolean
          ): boolean =>
            source == _nodeId &&
            (attributes.type == ProgramGraphEdgeType.CONTRIBUTOR_OF_AGGREGATION)
        );

        return edges.length > 0;
      }
    );

    const variablesUsedInEGDs = this.programGraph.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => {
        // Let's start from positions
        const isVariable = attributes.type === ProgramGraphNodeType.VARIABLE;

        if (!isVariable) return false;

        // Check edges from variable to position in head
        const edges = this.programGraph.graph.filterEdges(
          (
            edge: string,
            attributes: Attributes,
            source: string,
            target: string,
            sourceAttributes: Attributes,
            targetAttributes: Attributes,
            undirected: boolean
          ): boolean =>
            source == _nodeId &&
            (attributes.type == ProgramGraphEdgeType.VARIABLE_AT_EGD) &&
            !attributes.head
        );

        return edges.length > 0;
      }
    );   


    const variablesUsedInHeadAtoms = this.programGraph.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => {
        // Let's start from positions
        const isVariable = attributes.type === ProgramGraphNodeType.VARIABLE;

        if (!isVariable) return false;

        // Check edges from variable to position in head
        const edges = this.programGraph.graph.filterEdges(
          (
            edge: string,
            attributes: Attributes,
            source: string,
            target: string,
            sourceAttributes: Attributes,
            targetAttributes: Attributes,
            undirected: boolean
          ): boolean =>
            source == _nodeId &&
            (attributes.type == ProgramGraphEdgeType.VARIABLE_AT_POSITION) &&
            attributes.head
        );

        return edges.length > 0;
      }
    );   

    // Find variables used in single body atoms and 
    // not used in conditions (so that they are unused)
    // and not used in head atoms
    const variablesUsedInBodyAndNotInConditionsButNotInHead = variablesUsedInOneBodyAtom.filter(v => !variablesUsedInConditions.includes(v) && !variablesUsedInEGDs.includes(v) && !variablesUsedInHeadAtoms.includes(v) && !variablesUsedAsContributors.includes(v));

    const variablesUsedInBodyButNotInHeadTokens = concatenateArrays(
      this.programGraph.getTokensOfVariables(variablesUsedInBodyAndNotInConditionsButNotInHead)
    );

    // Add semantic modifier to tokens
    for (const token of variablesUsedInBodyButNotInHeadTokens) {
      token.modifiers.push(DatalogpmTokenModifier.UNUSED);
    }

    return variablesUsedInBodyButNotInHeadTokens;
  }

  getVariablesUsedInBodyButNotInHead2(): string[] {

    const variables: { [variable: string]: { appearInHead: boolean, appearInBody: boolean } } = {};

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
          attributes.type === ProgramGraphEdgeType.VARIABLE_AT_ATOM_TOKEN
        ) {
          if (!variables[variable]) {
            variables[variable] = {
              appearInHead: false,
              appearInBody: false
            };
          }

          if (atomTokenAttributes.location === AtomLocation.Head) {
            variables[variable].appearInHead = true;
          }
          if (atomTokenAttributes.location === AtomLocation.Body) {
            variables[variable].appearInBody = true;
          }

        }
      }
    );

    const variablesUsedInBodyButNotInHead: string[] = [];
    for (const variable of Object.keys(variables)) {
      if (variables[variable].appearInBody && !variables[variable].appearInHead) {
        variablesUsedInBodyButNotInHead.push(variable);
      }
    }

    return variablesUsedInBodyButNotInHead;
  }

  getDiagnostics2() {
    const diagnostics: Diagnostic[] = [];

    const namelessVariablesTokens = this.getVariablesUsedInBodyButNotInHead();

		for (const namelessVariablesToken of namelessVariablesTokens) {
			diagnostics.push(makeDiagnostic(
				namelessVariablesToken,
				ErrorTypes.ANONYMOUS_VARIABLE,
				{
					variable: namelessVariablesToken.text
				}
			));
		}

    return diagnostics;
  }


}