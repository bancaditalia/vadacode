// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Afrati Linear fragment analyzer.
 */

import { Attributes } from 'graphology-types';
import { Diagnostic } from 'vscode-languageserver/node';
import { makeDiagnostic } from '../../../diagnostics/utils';
import { CustomDiagnosticData } from '../../../isomorphic';
import { IDatalogpmToken } from '../../common';
import { ErrorTypes } from '../../diagnostic-messages';
import { AtomLocation, ProgramGraph, ProgramGraphEdgeType, ProgramGraphNodeType } from '../../program-graph';
import { ProgramGraphAnalyzer } from '../program-graph-analyzer';

export class AfratiLinearFragmentAnalyzer implements ProgramGraphAnalyzer {

  private _afratiNonLinearAtomTokens: IDatalogpmToken[] = [];
  get afratiNonLinearAtomTokens() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._afratiNonLinearAtomTokens;
  }

  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

    // Afrati Linear fragment detection: start ---
    this._markIntensionalAtoms();
    this._markAfratiLinearJoinTokens();
    // Afrati Linear fragment detection: end -----
		this._markAfratiNonLinearJoinTokens();
		this._analyzed = true;
	}

    /**
   * An atom is intensional if it appears at least once in the head of a rule
   */
  _markIntensionalAtoms() {
    
    const intensionalAtomTokensInHead = [];
    const intensionalAtoms: string[] = [];
    // Find atoms which appear in the head of a rule at least once.
    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        source: string,
        target: string,
        tokenAttributes: Attributes,
        atomAttributes: Attributes,
        undirected: boolean
      ) => {
        if (
          atomAttributes.type === ProgramGraphNodeType.ATOM &&
          attributes.location === AtomLocation.Head &&
          attributes.type == ProgramGraphEdgeType.TOKEN_OF          
        ) {
         intensionalAtoms.push(target);
        }
      }
    );    

    for (const intensionalAtom of intensionalAtoms) {
      this.programGraph.graph.updateNode(intensionalAtom, (attr: any) => {
        return {
          ...attr,
          intensional: true
        };
      });
    }
  }

  /**
   * Marks tokens involved in Afrati Linear joins.
   * "A linear program is a Datalog program such that every clause in the program
   * has at most one intensional atom in its body."
   */
  _markAfratiLinearJoinTokens() {

    const intensionalBodyAtomTokensPerRule: { [ruleId: string]: string[] } = {};
    // Find tokens of intensional atoms involved in body joins
    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        source: string,
        target: string,
        sourceAttributes: Attributes,
        targetAttributes: Attributes,
        undirected: boolean
      ) => {
        if (
          targetAttributes.type === ProgramGraphNodeType.ATOM &&
          targetAttributes.intensional &&
          attributes.location === AtomLocation.Body &&
          attributes.type == ProgramGraphEdgeType.TOKEN_OF          
        ) {
         if (!intensionalBodyAtomTokensPerRule[sourceAttributes.rule]) {
            intensionalBodyAtomTokensPerRule[sourceAttributes.rule] = [];
         }
         intensionalBodyAtomTokensPerRule[sourceAttributes.rule].push(source);
        }
      }
    );
    // Now mark the tokens involved in Afrati Linear joins
    for (const ruleId of Object.keys(intensionalBodyAtomTokensPerRule)) {
      const tokens = intensionalBodyAtomTokensPerRule[ruleId];
      // If there are more than one intensional atom in the body, mark them
      // as Afrati Linear join tokens
      for (const token of tokens) {
        this.programGraph.graph.updateNode(token, (attr: any) => {
          return {
            ...attr,
            afratiNonLinearJoin: tokens.length > 1
          };
        });
      }
    }
  }
  
	_markAfratiNonLinearJoinTokens() {
    // Afrati Linear
    const afratiNonLinearAtomTokens = this.programGraph.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => attributes.type === ProgramGraphNodeType.TOKEN &&
      attributes.afratiNonLinearJoin
    );
    this._afratiNonLinearAtomTokens = this.programGraph.getDatalogpmTokensOfTokens(afratiNonLinearAtomTokens);
	}

	getDiagnostics(): Diagnostic[] {
    return this.afratiNonLinearAtomTokensDiagnostic();
	}

  afratiNonLinearAtomTokensDiagnostic() {
    return this.afratiNonLinearAtomTokens.map(
      (datalogpmToken: IDatalogpmToken) => {
        const d: Diagnostic = makeDiagnostic(
          datalogpmToken,
          ErrorTypes.NON_AFRATI_LINEAR_JOIN,
          {atom: datalogpmToken.text}
        );
        d.data = {
          fragmentViolation: 'Afrati Linear'
        } as CustomDiagnosticData;
        return d;
    });
  }


}