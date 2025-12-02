// SPDX-License-Identifier: SSPL-1.0
// Copyright (c) 2023-present Banca d'Italia

/*  _   __        __                 __
 * | | / /__ ____/ /__ ________  ___/ /__
 * | |/ / _ `/ _  / _ `/ __/ _ \/ _  / -_)
 * |___/\_,_/\_,_/\_,_/\__/\___/\_,_/\__/
 * 
 * @file Plain Datalog fragment analyzer.
 */

import { Diagnostic } from 'vscode-languageserver/node';
import { makeDiagnostic } from '../../../diagnostics/utils';
import { CustomDiagnosticData } from '../../../isomorphic';
import { IDatalogpmToken } from '../../common';
import { ErrorTypes } from '../../diagnostic-messages';
import { getExistentialVariableNodes, ProgramGraph } from '../../program-graph';
import { concatenateArrays } from '../../set-utils';
import { ProgramGraphAnalyzer } from '../program-graph-analyzer';

export class PlainDatalogFragmentAnalyzer implements ProgramGraphAnalyzer {

  private _existentialVariableTokens: IDatalogpmToken[] = [];
  get existentialVariableTokens() {
    if (!this._analyzed) throw new Error("ProgramGraph not analyzed yet");
    return this._existentialVariableTokens;
  }

  protected _analyzed = false;

  programGraph!: ProgramGraph;

	analyze(programGraph: ProgramGraph): void {
    this.programGraph = programGraph;

    // Find all existential variables
    const existentialVariableNodes = getExistentialVariableNodes(this.programGraph.graph);

    this._existentialVariableTokens = concatenateArrays(
      this.programGraph.getTokensOfVariables(Array.from(existentialVariableNodes))
    );

		this._analyzed = true;
	}

	getDiagnostics(): Diagnostic[] {
    return this.datalogVariableTokensDiagnostic();
	}

  datalogVariableTokensDiagnostic() {
    return this.existentialVariableTokens.map(
      (datalogpmToken: IDatalogpmToken) => {
        const d = makeDiagnostic(
          datalogpmToken,
          ErrorTypes.EXISTENTIAL_VARIABLE_IN_DATALOG,
          {variable: datalogpmToken.text}
        );
        d.data = {
          fragmentViolation: 'Plain Datalog'
        } as CustomDiagnosticData;
        return d;
      }
    );
  }

}