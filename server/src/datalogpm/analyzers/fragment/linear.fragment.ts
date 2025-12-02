// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Linear fragment analyzer.
 */

import { Attributes } from 'graphology-types';
import { Diagnostic } from 'vscode-languageserver/node';
import { makeDiagnostic } from '../../../diagnostics/utils';
import { CustomDiagnosticData } from '../../../isomorphic';
import { IDatalogpmToken } from '../../common';
import { ErrorTypes } from '../../diagnostic-messages';
import { AtomLocation, ProgramGraph, ProgramGraphEdgeType, ProgramGraphNodeType } from '../../program-graph';
import { ProgramGraphAnalyzer } from '../program-graph-analyzer';

export class LinearFragmentAnalyzer implements ProgramGraphAnalyzer {

  private _nonLinearAtomTokens: IDatalogpmToken[] = [];
  get nonLinearAtomTokens() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._nonLinearAtomTokens;
  }

  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

    this._markNonLinearRules();    

		this._analyzed = true;
	}

  _markNonLinearRules() {
    const bodyAtomTokensPerRule: { [ruleId: string]: string[] } = {};
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
          attributes.location === AtomLocation.Body &&
          attributes.type == ProgramGraphEdgeType.TOKEN_OF          
        ) {
         if (!bodyAtomTokensPerRule[sourceAttributes.rule]) {
            bodyAtomTokensPerRule[sourceAttributes.rule] = [];
         }
         bodyAtomTokensPerRule[sourceAttributes.rule].push(source);
        }
      }
    );

    // Now mark the tokens involved in Linear joins
    for (const ruleId of Object.keys(bodyAtomTokensPerRule)) {
      const tokens = bodyAtomTokensPerRule[ruleId];
      this.programGraph.graph.updateNode(ruleId, (attr: any) => {
        return {
          ...attr,
          nonLinear: tokens.length > 1
        };
      }); 
    }
  }

	getDiagnostics(): Diagnostic[] {
    return this.nonLinearAtomTokensDiagnostic();
	}

  nonLinearAtomTokensDiagnostic() {

    const nonLinearRules = this.programGraph.graph.filterNodes(
      (_nodeId: string, attributes: Attributes): boolean => attributes.type === ProgramGraphNodeType.RULE &&
      attributes.nonLinear
    );

    return nonLinearRules.map(
      (ruleId: string) => {
        const ruleAttributes = this.programGraph.graph.getNodeAttributes(ruleId);
        const d: Diagnostic = makeDiagnostic(
          ruleAttributes.range,
          ErrorTypes.NON_LINEAR_RULE
        );
        d.data = {
          fragmentViolation: 'Linear'
        } as CustomDiagnosticData;
        return d;
    });
  }



}