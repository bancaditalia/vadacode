// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Analyzer for negation-related issues in Datalog+/- programs.
 */

import { Attributes } from 'graphology-types';
import { Diagnostic } from 'vscode-languageserver/node';
import { makeDiagnostic } from '../../diagnostics/utils';
import { IDatalogpmToken } from '../common';
import { ErrorTypes } from '../diagnostic-messages';
import { ProgramGraph, ProgramGraphEdgeType } from '../program-graph';
import { concatenateArrays } from '../set-utils';
import { ProgramGraphAnalyzer } from './program-graph-analyzer';

export class NegationAnalyzer implements ProgramGraphAnalyzer {
  private _inHeadAndOnlyInNegatedBodyTokens: IDatalogpmToken[] = [];
  get inHeadAndOnlyInNegatedBody() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._inHeadAndOnlyInNegatedBodyTokens;
  }

  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;
    
		this._analyzed = true;
	}

  private _getInvalidNegationAtoms(): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    // Every variable that occurs in the head must have a binding in a non-negated atom.

    type Token = {
        token: IDatalogpmToken;
        atom: string;
        negated: boolean;
        head: boolean
      };
    const variables: {
      [variable: string]: Token[];
    } = {};
    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        variable: string,
        atomToken: string,
        variableAttributes: Attributes,
        atomTokenAttributes: Attributes
      ) => {
        if (attributes.type == ProgramGraphEdgeType.VARIABLE_AT_ATOM_TOKEN) {

          if (!variables[variable]) {
            variables[variable] = [];
          }
          variables[variable].push({
            token: atomTokenAttributes.token,
            atom: atomToken,
            negated: attributes.negated,
            head: attributes.head
          });
        }
      }
    );

    const badNegationVariables: string[] = [];
    for (const [variable, tokens] of Object.entries(variables)) {
      const hasHeadToken = tokens.some(token => token.head);
      const hasNegatedTokenInTheBody = tokens.some(token => !token.head && token.negated);
      const hasNonNegatedTokenInTheBody = tokens.some(token => !token.head && !token.negated);

      // Every binding of a variable that occurs only in a negation...
      if (hasNegatedTokenInTheBody && !hasNonNegatedTokenInTheBody) {
        // ...is not exported outside of the negation.
        if (hasHeadToken) {
          badNegationVariables.push(variable);
        }
      }
    }

    const tokens: IDatalogpmToken[] = concatenateArrays(this.programGraph.getTokensOfVariables(badNegationVariables));
    for (const token of tokens) {
      diagnostics.push(
        makeDiagnostic(
          token,
          ErrorTypes.INVALID_NEGATION_POSITIVE_BODY_0,
          { variable: token.text }
        )
      );
    }    

    return diagnostics;
	}


	getDiagnostics(): Diagnostic[] {
    return [
      ...this._getInvalidNegationAtoms()
    ];
	}



}