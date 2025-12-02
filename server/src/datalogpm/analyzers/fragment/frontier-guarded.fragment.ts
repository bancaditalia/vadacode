// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Frontier Guarded Fragment analyzer.
 */

import { Attributes } from 'graphology-types';
import { Diagnostic } from 'vscode-languageserver/node';
import { makeDiagnostic } from '../../../diagnostics/utils';
import { CustomDiagnosticData } from '../../../isomorphic';
import { IDatalogpmToken } from '../../common';
import { ErrorTypes } from '../../diagnostic-messages';
import { AtomLocation, ProgramGraph, ProgramGraphEdgeType, ProgramGraphNodeType } from '../../program-graph';
import { setIncludes } from '../../set-utils';
import { ProgramGraphAnalyzer } from '../program-graph-analyzer';

export class FrontierGuardedFragmentAnalyzer implements ProgramGraphAnalyzer {

  private _atomTokensNotInAFrontierGuardedRule: IDatalogpmToken[] = [];
  get atomTokensNotInAFrontierGuardedRule() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._atomTokensNotInAFrontierGuardedRule;
  }

  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

		this.markFrontierGuardAtomTokens();
		this.markAtomTokensNotInAFrontierGuardedRule();
		this._analyzed = true;
	}

  markFrontierGuardAtomTokens() {
    const variablesPerRule: { [ruleId: string]: {
      variables: Set<string>,
      atomTokens: { [atomName: string]: Set<string> }
    } } = {};

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
          !attributes.head
        ) {
          // Add variable per rule
          if (!variablesPerRule[variableAttributes.rule]) {
            variablesPerRule[variableAttributes.rule] = {
              variables: new Set<string>(),
              atomTokens: {}
            };
          }

          const rule = variablesPerRule[variableAttributes.rule];
          // Add variable per rule
          rule.variables.add(variable);
          // Add variable per atom
          if (!rule.atomTokens[atomToken]) {
            rule.atomTokens[atomToken] = new Set<string>();
          }
          rule.atomTokens[atomToken].add(variable);
        }
      }
    );

    // Now, for each rule, filter only variables that are in the head
    // becase we are looking for universally quantified variables in the head.
    for (const ruleId of Object.keys(variablesPerRule)) {
      // An atom is guarded if its set of variables coincides with 
      // the overall set of variables in the body of the rule.
      const rule = variablesPerRule[ruleId];
      const headVariables = new Set<string>();
      this.programGraph.graph.forEachEdge(
        (
          edge: string,
          attributes: Attributes,
          source: string,
          target: string,
          sourceAttributes: Attributes,
          targetAttributes: Attributes,
          undirected: boolean
        ): void => {
          if (
            sourceAttributes.rule === ruleId &&
            attributes.type === ProgramGraphEdgeType.VARIABLE_AT_POSITION &&
            attributes.head &&
            rule.variables.has(source)
          ) {
            headVariables.add(source);
          }
        }        
      );
      rule.variables = headVariables;
    }

    // Now, for each rule...
    for (const ruleId of Object.keys(variablesPerRule)) {
      // An atom is frontier guarded if its set of variables coincides with 
      // the set of universal variables in the head.
      const rule = variablesPerRule[ruleId];
      for (const atomToken of Object.keys(rule.atomTokens)) {
        const atomTokens = rule.atomTokens[atomToken];
        // If the atom tokens are the same as the variables in the body of the rule,
        // then the atom is guarded.
        this.programGraph.graph.updateNode(atomToken, (attr: any) => {
          return {
            ...attr,
            frontierGuard: setIncludes(atomTokens, rule.variables)
          };
        });
      }
    }

  }


	markAtomTokensNotInAFrontierGuardedRule() {
    // Frontier guarded: A rule is guarded if there is at least one guard atom per rule
    const ruleFrontierGuards: { [ruleId: string]: {
      guardedTokens: IDatalogpmToken[];
      nonGuardedTokens: IDatalogpmToken[];
    } } = {};
    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        source: string,
        target: string,
        sourceAttributes: Attributes,
        targetAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          sourceAttributes.type === ProgramGraphNodeType.TOKEN && 
          attributes.location === AtomLocation.Body &&
          targetAttributes.type === ProgramGraphNodeType.ATOM
        ) {
          if (!ruleFrontierGuards[sourceAttributes.rule]) {
            ruleFrontierGuards[sourceAttributes.rule] = {
              guardedTokens: [],
              nonGuardedTokens: []
            };
          }
          if ("frontierGuard" in sourceAttributes) {
            if (sourceAttributes.frontierGuard) {
              ruleFrontierGuards[sourceAttributes.rule].guardedTokens.push(sourceAttributes.token);
            } else {
              ruleFrontierGuards[sourceAttributes.rule].nonGuardedTokens.push(sourceAttributes.token);
            }
          }
        }
      }
    );
    
    // A rule is non guarded if it has no guard atoms
    for (const ruleId of Object.keys(ruleFrontierGuards)) {
      // if (ruleFrontierGuards[ruleId].guardedTokens.length === 0) {
      //   // Rule is non guarded, all tokens are in a non guarded rule
      //   this._atomTokensNotInAFrontierGuardedRule = ruleFrontierGuards[ruleId].nonGuardedTokens;
      // }

      if (ruleFrontierGuards[ruleId].nonGuardedTokens.length > 0) {
        this.programGraph.graph.updateNode(ruleId, (attr: any) => {
          return {
            ...attr,
            frontierGuarded: ruleFrontierGuards[ruleId].guardedTokens.length > 0
          };
        }); 
      }

    }    

	}

	getDiagnostics(): Diagnostic[] {
		return this.atomTokensNotInAFrontierGuardedRuleDiagnostic();
	}

  atomTokensNotInAFrontierGuardedRuleDiagnostic() {

    const nonGuardedRules = this.programGraph.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => attributes.type === ProgramGraphNodeType.RULE &&
      "frontierGuarded" in attributes && attributes.frontierGuarded === false
    );

    return nonGuardedRules.map(
      (ruleId: string) => {
        const ruleAttributes = this.programGraph.graph.getNodeAttributes(ruleId);
        const d = makeDiagnostic(
          ruleAttributes.range,
          ErrorTypes.ERR_ATOM_NOT_IN_FRONTIER_GUARDED_RULE
        );
        d.data = {
          fragmentViolation: 'Frontier Guarded'
        } as CustomDiagnosticData;
        return d;
      }
    );
  }


}