// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Guarded Fragment Analyzer.
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

export class GuardedFragmentAnalyzer implements ProgramGraphAnalyzer {

  private _atomTokensNotInAGuardedRule: IDatalogpmToken[] = [];
  get atomTokensNotInAGuardedRule() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._atomTokensNotInAGuardedRule;
  }

  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

    this.markGuardAtomTokens();
		this.markAtomTokensNotInAGuardedRule();
		this._analyzed = true;
	}


  markGuardAtomTokens() {
    const variablesPerRule: { [ruleId: string]: {
      variables: Set<string>,
      atomTokens: { [atomName: string]: Set<string> }
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
          attributes.type === ProgramGraphEdgeType.VARIABLE_AT_ATOM_TOKEN &&
          !attributes.head
        ) {
          // Add variable per rule
          if (!variablesPerRule[sourceAttributes.rule]) {
            variablesPerRule[sourceAttributes.rule] = {
              variables: new Set<string>(),
              atomTokens: {}
            };
          }

          const rule = variablesPerRule[sourceAttributes.rule];
          // Add variable per rule
          rule.variables.add(source);
          // Add variable per atom
          if (!rule.atomTokens[target]) {
            rule.atomTokens[target] = new Set<string>();
          }
          rule.atomTokens[target].add(source);

        }
      }
    );

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
            guard: setIncludes(atomTokens, rule.variables)
          };
        });
      }
    }

  }


	markAtomTokensNotInAGuardedRule() {
    // Guarded: A rule is guarded if there is at least one guard atom per rule
    const ruleGuards: { [ruleId: string]: {
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
          if (!ruleGuards[sourceAttributes.rule]) {
            ruleGuards[sourceAttributes.rule] = {
              guardedTokens: [],
              nonGuardedTokens: []
            };
          }
          if ("guard" in sourceAttributes) {
            if (sourceAttributes.guard) {
              ruleGuards[sourceAttributes.rule].guardedTokens.push(sourceAttributes.token);
            } else {
              ruleGuards[sourceAttributes.rule].nonGuardedTokens.push(sourceAttributes.token);
            }
          }
        }
      }
    );
    
    // A rule is non guarded if it has no guard atoms
    for (const ruleId of Object.keys(ruleGuards)) {
      // if (ruleGuards[ruleId].guardedTokens.length === 0) {
      //   // Rule is non guarded, all tokens are in a non guarded rule
      //   this._atomTokensNotInAGuardedRule = ruleGuards[ruleId].nonGuardedTokens;
      // }

      if (ruleGuards[ruleId].nonGuardedTokens.length > 0) {
        this.programGraph.graph.updateNode(ruleId, (attr: any) => {
          return {
            ...attr,
            guarded: ruleGuards[ruleId].guardedTokens.length > 0
          };
        }); 
      }
    }
	}

	getDiagnostics(): Diagnostic[] {
    return this.atomTokensNotInAGuardedRuleDiagnostic();
	}

  atomTokensNotInAGuardedRuleDiagnostic() {
    const nonGuardedRules = this.programGraph.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => attributes.type === ProgramGraphNodeType.RULE &&
      "guarded" in attributes && attributes.guarded === false
    );

    return nonGuardedRules.map(
      (ruleId: string) => {
        const ruleAttributes = this.programGraph.graph.getNodeAttributes(ruleId);
        const d = makeDiagnostic(
          ruleAttributes.range,
          ErrorTypes.ERR_ATOM_NOT_IN_GUARDED_RULE
        );
        d.data = {
          fragmentViolation: 'Guarded'
        } as CustomDiagnosticData;
        return d;
      }
    );
  }



}