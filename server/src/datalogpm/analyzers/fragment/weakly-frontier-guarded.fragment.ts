// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Weakly Frontier Guarded fragment analyzer.
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

export class WeaklyFrontierGuardedFragmentAnalyzer implements ProgramGraphAnalyzer {

	private _atomTokensNotInAWeaklyFrontierGuardedRule: IDatalogpmToken[] = [];
  get atomTokensNotInAWeaklyFrontierGuardedRule() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._atomTokensNotInAWeaklyFrontierGuardedRule;
  }

  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

		this.markWeakFrontierGuardAtomTokens();
		this.markAtomTokensNotInAWeaklyFrontierGuardedRule();
		this._analyzed = true;
	}

  /**
   * Marks tokens that are frontier guarded. This implementation is based
   * on the definition in "Expressiveness of guarded existential rule languages".
   */          
  markWeakFrontierGuardAtomTokens() {
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
        targetAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          attributes.type === ProgramGraphEdgeType.VARIABLE_AT_ATOM_TOKEN &&
          variableAttributes.dangerous &&
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
      // An atom is guarded if its set of variables coincides with 
      // the overall set of variables in the body of the rule.
      const rule = variablesPerRule[ruleId];
      for (const atomToken of Object.keys(rule.atomTokens)) {
        const atomTokens = rule.atomTokens[atomToken];
        // If the atom tokens are the same as the variables in the body of the rule,
        // then the atom is guarded.
        this.programGraph.graph.updateNode(atomToken, (attr: any) => {
          return {
            ...attr,
            weakFrontierGuard: setIncludes(atomTokens, rule.variables)
          };
        });
      }
    }

  }
          

	markAtomTokensNotInAWeaklyFrontierGuardedRule() {
    // Weakly Frontier Guardead:
    // - a guard atom in the body that contains all the universally quantified variables of the rule head
    // - and the 
    const ruleWeakFrontierGuards: { [ruleId: string]: {
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
          sourceAttributes.location === AtomLocation.Body &&
          targetAttributes.type === ProgramGraphNodeType.ATOM
        ) {
          if (!ruleWeakFrontierGuards[sourceAttributes.rule]) {
            ruleWeakFrontierGuards[sourceAttributes.rule] = {
              guardedTokens: [],
              nonGuardedTokens: []
            };
          }
          if ("weakFrontierGuard" in sourceAttributes) {
            if (sourceAttributes.weakFrontierGuard) {
              ruleWeakFrontierGuards[sourceAttributes.rule].guardedTokens.push(sourceAttributes.token);
            } else {
              ruleWeakFrontierGuards[sourceAttributes.rule].nonGuardedTokens.push(sourceAttributes.token);
            }
          }
        }
      }
    );
    
    // A rule is non guarded if it has no guard atoms
    for (const ruleId of Object.keys(ruleWeakFrontierGuards)) {
      // if (ruleWeakFrontierGuards[ruleId].guardedTokens.length === 0) {
      //   // Rule is non guarded, all tokens are in a non guarded rule
      //   this._atomTokensNotInAWeaklyFrontierGuardedRule = ruleWeakFrontierGuards[ruleId].nonGuardedTokens;
      // }

      if (ruleWeakFrontierGuards[ruleId].nonGuardedTokens.length > 0) {
        this.programGraph.graph.updateNode(ruleId, (attr: any) => {
          return {
            ...attr,
            weaklyFrontierGuarded: ruleWeakFrontierGuards[ruleId].guardedTokens.length > 0
          };
        }); 
      }

    }    

	}

	getDiagnostics(): Diagnostic[] {
		return this.atomTokensNotInAWeaklyFrontierGuardedRuleDiagnostic();
	}

  atomTokensNotInAWeaklyFrontierGuardedRuleDiagnostic() {
    const nonGuardedRules = this.programGraph.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => attributes.type === ProgramGraphNodeType.RULE &&
      "weaklyFrontierGuarded" in attributes && attributes.weaklyFrontierGuarded === false
    );

    return nonGuardedRules.map(
      (ruleId: string) => {
        const ruleAttributes = this.programGraph.graph.getNodeAttributes(ruleId);
        const d = makeDiagnostic(
          ruleAttributes.range,
          ErrorTypes.ERR_ATOM_NOT_IN_WEAKLY_FRONTIER_GUARDED_RULE
        );
        d.data = {
          fragmentViolation: 'Weakly Frontier Guarded'
        } as CustomDiagnosticData;
        return d;
      }
    );
  }	

}