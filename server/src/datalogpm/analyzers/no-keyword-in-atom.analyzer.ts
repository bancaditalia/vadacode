import { Attributes } from 'graphology-types';
import { Diagnostic } from 'vscode-languageserver/node';
import { makeDiagnostic } from '../../diagnostics/utils';
import { ErrorTypes } from '../diagnostic-messages';
import { IDatalogpmToken } from '../common';
import { ProgramGraph, ProgramGraphEdgeType, ProgramGraphNodeType } from '../program-graph';
import { ProgramGraphAnalyzer } from './program-graph-analyzer';

export const DATALOGPM_KEYWORDS = [
  "msum",
  "mprod",
  "mcount",
  "munion",
  "mmax",
  "mmin",
  "union",
  "list",
  "set",
  "min",
  "max",
  "sum",
  "prod",
  "avg",
  "count"
];

export class NoKeywordInAtomNamesAnalyzer implements ProgramGraphAnalyzer {

  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

		this._analyzed = true;
	}
  
	getDiagnostics(): Diagnostic[] {
    return this.noKeywordInAtomNamesDiagnostic();
	}

  noKeywordInAtomNamesDiagnostic() {
    const diagnostics: Diagnostic[] = [];

    const keywordAtoms: { [atom: string]: IDatalogpmToken[]} = {};

    this.programGraph.graph.forEachEdge(
      (
        edge: string,
        attributes: Attributes,
        token: string,
        atom: string,
        tokenAttributes: Attributes,
        atomAttributes: Attributes,
        undirected: boolean
      ): void => {
        if (
          atomAttributes.type == ProgramGraphNodeType.ATOM &&
          attributes.type == ProgramGraphEdgeType.TOKEN_OF &&
          tokenAttributes.type == ProgramGraphNodeType.TOKEN
        ) {
          const token = tokenAttributes['token'] as IDatalogpmToken;
          if (!token) {
            return;
          }
          if  (DATALOGPM_KEYWORDS.includes(token.text)) {
            if (!keywordAtoms[atom]) {
              keywordAtoms[atom] = [];
            }
            keywordAtoms[atom].push(token);
          }
        }
      }
    );

    // Filter input and output with the same name
    const keywordAtomNames = Object.keys(keywordAtoms);

    for (const atomName of keywordAtomNames) {
      for (const token of keywordAtoms[atomName]) {
        diagnostics.push(
          makeDiagnostic(
            token,
            ErrorTypes.ERR_NO_KEYWORD_IN_ATOM_NAME,
            { keyword: token.text }
          )
        );
      }     
    }

    return diagnostics;
  }


}